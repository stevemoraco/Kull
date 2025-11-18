import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { verifyDeviceToken } from './device-auth';

const router = Router();

// Configure multer for in-memory storage (max 25MB for audio files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max (OpenAI Whisper limit)
  },
  fileFilter: (_req, file, cb) => {
    // Accept only audio files
    const allowedMimeTypes = [
      'audio/m4a',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/x-m4a',
      'application/octet-stream', // iOS sometimes sends this
    ];

    if (allowedMimeTypes.includes(file.mimetype) ||
        file.originalname.match(/\.(m4a|mp3|wav|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/transcribe
 * Transcribe audio file using OpenAI Whisper API
 *
 * @requires Authentication (JWT token)
 * @body file - Audio file (m4a, mp3, wav, webm)
 * @returns { text: string } - Transcribed text
 */
router.post('/transcribe', verifyDeviceToken, upload.single('file'), async (req: any, res: Response) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`[Transcription] User ${userId} uploading ${req.file.originalname} (${req.file.size} bytes)`);

    // Convert buffer to File for OpenAI API
    // OpenAI expects a File object with specific properties
    const audioFile = new File(
      [req.file.buffer],
      req.file.originalname,
      { type: req.file.mimetype }
    );

    // Call OpenAI Whisper API
    const startTime = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Can be changed to auto-detect or user preference
      response_format: 'json',
    });

    const duration = Date.now() - startTime;

    // Log success for admin debugging
    console.log(`[Transcription] Success for user ${userId} in ${duration}ms: "${transcription.text.substring(0, 100)}${transcription.text.length > 100 ? '...' : ''}"`);

    // Return transcribed text
    res.json({ text: transcription.text });

  } catch (error: any) {
    console.error('[Transcription] Error:', error);

    // Handle specific OpenAI errors
    if (error.status === 413) {
      return res.status(413).json({
        error: 'Audio file too large. Maximum size is 25MB.',
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please try again in a moment.',
      });
    }

    if (error.code === 'invalid_api_key') {
      console.error('[Transcription] CRITICAL: Invalid OpenAI API key');
      return res.status(500).json({
        error: 'Transcription service configuration error',
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Transcription failed. Please try again.',
    });
  }
});

export default router;
