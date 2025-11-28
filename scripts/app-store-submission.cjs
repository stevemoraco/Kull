const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');

const KEY_ID = 'S9KW8G5RHS';
const ISSUER_ID = 'c63dccab-1ecd-41dc-9374-174cfdb70958';
const PRIVATE_KEY_PATH = '/Users/stevemoraco/.private_keys/AuthKey_S9KW8G5RHS.p8';
const APP_ID = '6755838738';
const IOS_VERSION_ID = '9e08a736-8071-4d38-977b-00d66cfcf13d';
const MACOS_VERSION_ID = 'c5c0bf13-a11d-4e57-a113-099427eba0d4';

function generateToken() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '20m',
    issuer: ISSUER_ID,
    audience: 'appstoreconnect-v1',
    header: {
      alg: 'ES256',
      kid: KEY_ID,
      typ: 'JWT'
    }
  });
  return token;
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const token = generateToken();

    const options = {
      hostname: 'api.appstoreconnect.apple.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function main() {
  console.log('Step 1: Getting App Info...');
  const appData = await makeRequest('GET', `/v1/apps/${APP_ID}?include=appInfos`);

  if (appData.errors) {
    console.error('Error getting app info:', JSON.stringify(appData.errors, null, 2));
    process.exit(1);
  }

  console.log('App data:', JSON.stringify(appData, null, 2));

  const appInfoId = appData.included?.[0]?.id;
  if (!appInfoId) {
    console.error('No appInfo found');
    process.exit(1);
  }

  console.log(`\nStep 2: Getting Age Rating Declaration for appInfo: ${appInfoId}...`);
  const ageRatingData = await makeRequest('GET', `/v1/appInfos/${appInfoId}/ageRatingDeclaration`);

  if (ageRatingData.errors) {
    console.error('Error getting age rating:', JSON.stringify(ageRatingData.errors, null, 2));
    process.exit(1);
  }

  console.log('Age rating data:', JSON.stringify(ageRatingData, null, 2));

  const ageRatingId = ageRatingData.data?.id;
  if (!ageRatingId) {
    console.error('No age rating declaration found');
    process.exit(1);
  }

  console.log(`\nStep 3: Updating Age Ratings (ID: ${ageRatingId})...`);
  const updateBody = {
    data: {
      type: 'ageRatingDeclarations',
      id: ageRatingId,
      attributes: {
        alcoholTobaccoOrDrugUseOrReferences: 'NONE',
        contests: 'NONE',
        gambling: false,  // BOOLEAN, not STRING
        gamblingSimulated: 'NONE',
        horrorOrFearThemes: 'NONE',
        matureOrSuggestiveThemes: 'NONE',
        medicalOrTreatmentInformation: 'NONE',
        profanityOrCrudeHumor: 'NONE',
        sexualContentGraphicAndNudity: 'NONE',
        sexualContentOrNudity: 'NONE',
        violenceCartoonOrFantasy: 'NONE',
        violenceRealistic: 'NONE',
        violenceRealisticProlongedGraphicOrSadistic: 'NONE',
        unrestrictedWebAccess: false
      }
    }
  };

  const updateResult = await makeRequest('PATCH', `/v1/ageRatingDeclarations/${ageRatingId}`, updateBody);

  if (updateResult.errors) {
    console.error('Error updating age ratings:', JSON.stringify(updateResult.errors, null, 2));
    process.exit(1);
  }

  console.log('Age ratings updated successfully!');
  console.log(JSON.stringify(updateResult, null, 2));

  console.log(`\nStep 4: Submitting iOS version (${IOS_VERSION_ID}) for review...`);
  const iosSubmission = {
    data: {
      type: 'appStoreVersionSubmissions',
      relationships: {
        appStoreVersion: {
          data: {
            type: 'appStoreVersions',
            id: IOS_VERSION_ID
          }
        }
      }
    }
  };

  const iosResult = await makeRequest('POST', '/v1/appStoreVersionSubmissions', iosSubmission);

  if (iosResult.errors) {
    console.error('Error submitting iOS version:', JSON.stringify(iosResult.errors, null, 2));
  } else {
    console.log('iOS version submitted successfully!');
    console.log(JSON.stringify(iosResult, null, 2));
  }

  console.log(`\nStep 5: Submitting macOS version (${MACOS_VERSION_ID}) for review...`);
  const macosSubmission = {
    data: {
      type: 'appStoreVersionSubmissions',
      relationships: {
        appStoreVersion: {
          data: {
            type: 'appStoreVersions',
            id: MACOS_VERSION_ID
          }
        }
      }
    }
  };

  const macosResult = await makeRequest('POST', '/v1/appStoreVersionSubmissions', macosSubmission);

  if (macosResult.errors) {
    console.error('Error submitting macOS version:', JSON.stringify(macosResult.errors, null, 2));
  } else {
    console.log('macOS version submitted successfully!');
    console.log(JSON.stringify(macosResult, null, 2));
  }

  console.log('\nStep 6: Verifying submission status...');
  const iosStatus = await makeRequest('GET', `/v1/appStoreVersions/${IOS_VERSION_ID}`);
  const macosStatus = await makeRequest('GET', `/v1/appStoreVersions/${MACOS_VERSION_ID}`);

  console.log('\niOS Version Status:', iosStatus.data?.attributes?.appStoreState || 'Unknown');
  console.log('macOS Version Status:', macosStatus.data?.attributes?.appStoreState || 'Unknown');

  console.log('\n=== SUMMARY ===');
  console.log('Age Ratings: Updated to NONE for all categories');
  console.log('iOS Submission:', iosResult.errors ? 'FAILED' : 'SUCCESS');
  console.log('macOS Submission:', macosResult.errors ? 'FAILED' : 'SUCCESS');
}

main().catch(console.error);
