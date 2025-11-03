Pricing

.tab\_btn\_text { transition: color 0.5s cubic-bezier(0.215, 0.61, 0.355, 1); } .tab\_btn\_wrap:hover { color: var(--\_theme---foreground-primary); background-color: var(--\_theme---background-primary); } .tab\_btn\_wrap.is-active { color: var(--\_theme---foreground-primary); background-color: var(--\_theme---white); } .tab\_menu\_inner:has(.tab\_btn\_wrap:not(.is-active):hover) .tab\_btn\_wrap.is-active { background-color: transparent; } .tab\_btn\_wrap { /\*flex-grow: 1;\*/ } .tab\_dropdown\_list .tab\_btn\_wrap { justify-content: start; width: 100%; } .tab\_dropdown\_list .tab\_btn\_wrap:hover { background-color: var(--\_theme---background-secondary); } .tab\_dropdown\_wrap:has(.tab\_btn\_wrap.is-active:only-child) .tab\_dropdown\_icon, .tab\_dropdown\_wrap:has(.tab\_btn\_wrap.is-active:only-child) .tab\_dropdown\_list { display: none !important; } .tab\_dropdown\_btn:has(.tab\_dropdown\_text:not(:empty)) { padding-inline: 1rem; color: var(--\_theme---foreground-primary); }

(function () { // ---- tiny utilities ------------------------------------------------------ function onDOMReady(cb) { if ( document.readyState === "complete" || document.readyState === "interactive" ) cb(); else document.addEventListener("DOMContentLoaded", cb, { once: true }); } function whenGSAPReady(cb) { // Wait for gsap to exist (handles load-order issues in embeds) if (window.gsap) { cb(); } else { setTimeout(function () { whenGSAPReady(cb); }, 40); } } // ---- initializer --------------------------------------------------------- function initTabsComponent(comp) { if (!comp || comp.dataset.scriptInitialized) return; comp.dataset.scriptInitialized = "true"; var menu = comp.querySelector('\[data-tabs="menu"\]'); if (!menu) { console.warn("Tabs: menu not found", comp); return; } var tabs = Array.prototype.slice.call( menu.querySelectorAll('\[data-tabs="tab"\]') ); var panels = Array.prototype.slice.call( comp.querySelectorAll('\[data-tabs="panel"\]') ); // Get overflow elements var overflowParent = menu.querySelector('\[data-tabs="overflow"\]'); var overflowBtn = menu.querySelector('\[data-tabs="overflow-btn"\]'); var overflowMenu = menu.querySelector('\[data-tabs="overflow-menu"\]'); var tabDropdownText = overflowBtn ? overflowBtn.querySelector('.tab\_dropdown\_text') : null; if (!tabs.length || !panels.length) { console.warn("Tabs: tabs or panels missing", comp); return; } // Dropdown state management var isDropdownOpen = false; // Initialize dropdown state function initDropdown() { if (!overflowParent || !overflowBtn || !overflowMenu) return; // Set initial state gsap.set(overflowMenu, { opacity: 0, y: 10, display: "none", pointerEvents: "none", }); // Initialize dropdown text as hidden if (tabDropdownText) { tabDropdownText.style.display = 'none'; } // Add click handler to dropdown button overflowBtn.addEventListener("click", function (e) { e.preventDefault(); toggleDropdown(); }); // Close dropdown when clicking outside document.addEventListener("click", function (e) { if ( !overflowBtn.contains(e.target) && !overflowMenu.contains(e.target) ) { closeDropdown(); } }); } // Toggle dropdown open/close function toggleDropdown() { if (isDropdownOpen) { closeDropdown(); } else { openDropdown(); } } // Open dropdown with animation function openDropdown() { if (!overflowMenu || isDropdownOpen) return; isDropdownOpen = true; overflowBtn.setAttribute("aria-expanded", "true"); gsap.set(overflowMenu, { display: "block" }); gsap.to(overflowMenu, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", onComplete: function () { gsap.set(overflowMenu, { pointerEvents: "auto" }); }, }); } // Close dropdown with animation function closeDropdown() { if (!overflowMenu || !isDropdownOpen) return; isDropdownOpen = false; overflowBtn.setAttribute("aria-expanded", "false"); gsap.set(overflowMenu, { pointerEvents: "none" }); gsap.to(overflowMenu, { opacity: 0, y: 10, duration: 0.2, ease: "power2.in", onComplete: function () { gsap.set(overflowMenu, { display: "none" }); }, }); } // Manage dropdown text state function updateDropdownText(shouldShow, tabText) { if (!tabDropdownText) return; if (shouldShow && tabText) { tabDropdownText.style.display = 'flow-root'; tabDropdownText.textContent = tabText; } else { tabDropdownText.style.display = 'none'; tabDropdownText.textContent = ''; } } // Get current dropdown button width including text function getDropdownButtonWidth() { if (!overflowBtn) return 50; // Temporarily show to measure if hidden var wasHidden = overflowParent.style.display === 'none'; if (wasHidden) { overflowParent.style.display = 'block'; } var width = overflowBtn.getBoundingClientRect().width; // Hide again if it was hidden if (wasHidden) { overflowParent.style.display = 'none'; } return width || 50; } function calculateVisibleTabs(availableWidth) { var cumulativeWidth = 0; var visibleCount = 0; for (var i = 0; i < tabs.length; i++) { var tabWidth = tabs\[i\].getBoundingClientRect().width; if (cumulativeWidth + tabWidth <= availableWidth) { cumulativeWidth += tabWidth; visibleCount++; } else { break; } } return visibleCount; } function handleOverflowTabs() { if (!overflowParent || !overflowBtn || !overflowMenu) return; // Reset all tabs to visible for accurate measurement tabs.forEach(function(tab) { tab.style.display = 'flex'; }); // Measure the actual flex container (.tab\_menu\_inner) var parentRect = menu.getBoundingClientRect(); var parentWidth = parentRect.width; var style = getComputedStyle(menu); var paddingLeft = parseFloat(style.paddingLeft) || 0; var paddingRight = parseFloat(style.paddingRight) || 0; parentWidth = parentWidth - paddingLeft - paddingRight; // First pass: calculate without dropdown overflowParent.style.display = 'none'; updateDropdownText(false); var initialVisibleCount = calculateVisibleTabs(parentWidth); if (initialVisibleCount >= tabs.length) { // All fit, hide dropdown tabs.forEach(function(tab) { tab.style.display = 'flex'; }); overflowMenu.innerHTML = ''; return; } // Re-enable dropdown for split overflowParent.style.display = 'block'; updateDropdownText(false); var dropdownWidth = getDropdownButtonWidth(); var availableWidth = parentWidth - dropdownWidth; var visibleCount = Math.max(1, Math.min(calculateVisibleTabs(availableWidth), 5)); var visibleTabs = tabs.slice(0, visibleCount); var overflowTabs = tabs.slice(visibleCount); // Hide overflow tabs overflowTabs.forEach(function (tab) { tab.style.display = 'none'; }); // Populate dropdown overflowMenu.innerHTML = ''; overflowTabs.forEach(function (tab) { var clone = tab.cloneNode(true); clone.style.display = 'flex'; clone.classList.remove('is-active'); clone.setAttribute('aria-selected', 'false'); clone.setAttribute('tabindex', '-1'); clone.addEventListener('click', function (e) { e.preventDefault(); setActive(tabs.indexOf(tab)); closeDropdown(); }); overflowMenu.appendChild(clone); }); // If active tab is in dropdown, show its text var activeInDropdown = activeIndex >= visibleCount; if (activeInDropdown) { updateDropdownText(true, tabs\[activeIndex\].textContent.trim()); } updateDropdownTabStates(); } // Update active states in dropdown function updateDropdownTabStates() { if (!overflowParent || !overflowMenu) return; var dropdownTabs = overflowMenu.querySelectorAll('\[data-tabs="tab"\]'); var activeTabInDropdown = tabs\[activeIndex\].style.display === 'none'; dropdownTabs.forEach(function(dropdownTab, index) { var originalIndex = tabs.findIndex(function(tab) { return tab.textContent.trim() === dropdownTab.textContent.trim(); }); if (originalIndex === activeIndex) { dropdownTab.classList.add("is-active"); dropdownTab.setAttribute("aria-selected", "true"); // Hide active tab in dropdown if it's shown in dropdown text if (activeTabInDropdown && tabDropdownText && tabDropdownText.style.display !== 'none') { dropdownTab.style.display = "none"; } else { dropdownTab.style.display = "flex"; } } else { dropdownTab.classList.remove("is-active"); dropdownTab.setAttribute("aria-selected", "false"); dropdownTab.style.display = "flex"; } }); } // Determine initial active tab var activeIndex = Math.max( 0, tabs.findIndex ? tabs.findIndex(function (t) { return ( t.classList.contains("is-active") || t.getAttribute("aria-selected") === "true" ); }) : 0 ); // ARIA wiring tabs.forEach(function (t, i) { t.setAttribute("role", "tab"); t.setAttribute("aria-selected", i === activeIndex ? "true" : "false"); t.setAttribute("tabindex", i === activeIndex ? "0" : "-1"); }); panels.forEach(function (p, i) { p.setAttribute("role", "tabpanel"); p.hidden = i !== activeIndex; }); // Activate a tab/panel function setActive(index, conf) { conf = conf || {}; if (index === activeIndex || index < 0 || index >= tabs.length) return; var prev = activeIndex; var next = index; var wasActiveTabInDropdown = tabs\[prev\].style.display === 'none'; var newActiveTabInDropdown = tabs\[next\].style.display === 'none'; tabs\[prev\].classList.remove("is-active"); tabs\[prev\].setAttribute("aria-selected", "false"); tabs\[prev\].setAttribute("tabindex", "-1"); tabs\[next\].classList.add("is-active"); tabs\[next\].setAttribute("aria-selected", "true"); tabs\[next\].setAttribute("tabindex", "0"); panels\[prev\].hidden = true; panels\[next\].hidden = false; activeIndex = next; const tabChangeEvent = new CustomEvent('tabchange', { detail: { tabComponent: comp, activeIndex: next, activePanel: panels\[next\] } }); document.dispatchEvent(tabChangeEvent); // Always recalculate when switching contexts or between dropdown tabs var needsRecalculation = wasActiveTabInDropdown !== newActiveTabInDropdown || (wasActiveTabInDropdown && newActiveTabInDropdown); if (needsRecalculation) { // Full recalculation to ensure correct layout handleOverflowTabs(); } // Update dropdown states (if not already done by recalculation) if (!needsRecalculation) { updateDropdownTabStates(); } // Stagger in the new panel's items var items = panels\[next\].querySelectorAll("\[data-stagger\]"); var targets = items.length ? items : panels\[next\].children; if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) { gsap.killTweensOf(targets); gsap.set(targets, { y: 40, autoAlpha: 0 }); gsap.to(targets, { y: 0, autoAlpha: 1, duration: 0.65, ease: "power3.out", stagger: 0.1, delay: 0.2, overwrite: "auto", clearProps: "transform", }); } } // Click + keyboard navigation tabs.forEach(function (tab, i) { tab.addEventListener("click", function (e) { e.preventDefault(); setActive(i); }); tab.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); var next = (i + 1) % tabs.length; tabs\[next\].focus(); setActive(next); } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); var prev = (i - 1 + tabs.length) % tabs.length; tabs\[prev\].focus(); setActive(prev); } }); }); // Handle window resize with debouncing - iOS Safari fix var resizeTimer; var lastParentWidth = 0; function handleResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(function() { // Get current parent width var currentParentWidth = menu.parentElement.getBoundingClientRect().width; // Only recalculate if width has meaningfully changed // This prevents iOS Safari viewport height changes from triggering recalculation if (Math.abs(currentParentWidth - lastParentWidth) > 5) { lastParentWidth = currentParentWidth; handleOverflowTabs(); } }, 150); } window.addEventListener('resize', handleResize); // Initialize everything handleOverflowTabs(); // Store initial width lastParentWidth = menu.parentElement.getBoundingClientRect().width; initDropdown(); // Store cleanup function for potential later use comp.\_tabsCleanup = function() { window.removeEventListener('resize', handleResize); }; } // boot: wait for DOM + GSAP, then init + observe onDOMReady(function () { whenGSAPReady(function () { // init any existing instances document .querySelectorAll("\[data-tabs='component'\]") .forEach(initTabsComponent); // Observe future inserts (CMS Load, pagination, etc.) var mo = new MutationObserver(function (muts) { muts.forEach(function (m) { m.addedNodes.forEach(function (node) { if (!(node instanceof Element)) return; if (node.matches && node.matches("\[data-tabs='component'\]")) { initTabsComponent(node); } var found = node.querySelectorAll ? node.querySelectorAll("\[data-tabs='component'\]") : \[\]; if (found.length) found.forEach(initTabsComponent); }); }); }); mo.observe(document.documentElement, { childList: true, subtree: true }); }); }); })();

Individual

Team & Enterprise

API

.card\_pricing\_wrap:has(.card\_pricing\_body) { row-gap: var(--\_spacing---space--2rem); } .card\_pricing\_wrap:has(.card\_pricing\_body) .card\_pricing\_price\_wrap { margin-bottom: 0; } .card\_pricing\_wrap:has(> div:nth-child(5)) { grid-row: span 5; } .card\_pricing\_wrap:has(> div:nth-child(6)) { grid-row: span 6; } .card\_pricing\_wrap:has(> div:nth-child(7)) { grid-row: span 7; } .card\_pricing\_wrap:has(> div:nth-child(8)) { grid-row: span 8; } /\* Max Plan \*/ .card\_pricing\_wrap:where(\[data-wf--card-pricing-main--card-style="max"\]) { --\_theme---pictogram-accent: var(--swatch--sky); }

### Free

Try Claude

$0

Free for everyone

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Try Claude

[Try Claude](https://claude.ai/redirect/website.v1.7e047257-6763-4812-8a7b-5bcbe8589994)Try Claude

*   Chat on web, iOS, Android, and on your desktop
*   Generate code and visualize data
*   Write, edit, and create content
*   Analyze text and images
*   Ability to search the web
*   Unlock more from Claude with desktop extensions

### Pro

For everyday productivity

$17

Per month with annual subscription discount ($200 billed up front). $20 if billed monthly.

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Try Claude

[Try Claude](https://claude.ai/redirect/website.v1.7e047257-6763-4812-8a7b-5bcbe8589994)Try Claude

Everything in Free, plus:

*   More usage\*
*   Access Claude Code on the web and in your terminal
*   Create files and execute code
*   Access to unlimited projects to organize chats and documents
*   Access to Research
*   Connect Google Workspace: email, calendar, and docs
*   Integrate any context or tool through connectors with remote MCP
*   Extended thinking for complex work
*   Ability to use more Claude models

### Max

Get the most out of Claude

From $100

Per person billed monthly

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Try Claude

[Try Claude](https://claude.ai/redirect/website.v1.7e047257-6763-4812-8a7b-5bcbe8589994)Try Claude

Everything in Pro, plus:

*   Choose 5x or 20x more usage than Pro\*
*   Higher output limits for all tasks
*   Memory across conversations
*   Early access to advanced Claude features
*   Priority access at high traffic times

Additional [usage limits](https://support.anthropic.com/en/articles/9797557-usage-limit-best-practices) apply. Prices shown don’t include applicable tax.

.card\_pricing\_wrap:has(.card\_pricing\_body) { row-gap: var(--\_spacing---space--2rem); } .card\_pricing\_wrap:has(.card\_pricing\_body) .card\_pricing\_price\_wrap { margin-bottom: 0; } .card\_pricing\_wrap:has(> div:nth-child(5)) { grid-row: span 5; } .card\_pricing\_wrap:has(> div:nth-child(6)) { grid-row: span 6; } .card\_pricing\_wrap:has(> div:nth-child(7)) { grid-row: span 7; } .card\_pricing\_wrap:has(> div:nth-child(8)) { grid-row: span 8; } /\* Max Plan \*/ .card\_pricing\_wrap:where(\[data-wf--card-pricing-main--card-style="max"\]) { --\_theme---pictogram-accent: var(--swatch--sky); }

### Team

For collaboration across organizations

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Create a Team plan

[Create a Team plan](https://claude.ai/redirect/website.v1.7e047257-6763-4812-8a7b-5bcbe8589994/upgrade)Create a Team plan

Standard seat

Chat, projects, and more

$25

Per person / month with annual subscription discount. $30 if billed monthly. Minimum 5 members.

Premium seat

Includes Claude Code

$150

Per person / month. Minimum 5 members.

*   More usage\*
*   Admin controls for remote and local connectors
*   Enterprise deployment for the Claude desktop app
*   Enterprise search across your organization
*   Connect Microsoft 365, Slack, and more
*   Central billing and administration
*   Early access to collaboration features
*   Claude Code available with premium seat

### Enterprise

For businesses operating at scale

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Contact sales

[Contact sales](/contact-sales)Contact sales

Everything in Team, plus:

*   More usage\*
*   Enhanced context window
*   Single sign-on (SSO) and domain capture
*   Role-based access with fine-grained permissioning
*   System for Cross-domain Identity Management (SCIM)
*   Audit logs
*   Google Docs cataloging
*   Compliance API for observability and monitoring
*   Claude Code available with premium seat
*   Custom data retention controls

Additional [usage limits](https://support.anthropic.com/en/articles/9797557-usage-limit-best-practices) apply. Prices shown don’t include applicable tax.

Education plan

Get a comprehensive university‐wide plan for an institution, including its students, faculty, and staff.

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Learn more

[Learn more](/solutions/education)Learn more

Student and faculty access

Comprehensive access for all university members at discounted rates

@container (width < 32em) { .c-grid:has(.icon-block\_wrap) { row-gap: 1.5rem; } }

Academic research and learning mode

Dedicated API credits and educational features for student learning

@container (width < 32em) { .c-grid:has(.icon-block\_wrap) { row-gap: 1.5rem; } }

Training and enablement

Resources for successful adoption across your institution

@container (width < 32em) { .c-grid:has(.icon-block\_wrap) { row-gap: 1.5rem; } }

Latest models

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Contact sales

[Contact sales](/contact-sales)Contact sales

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Start building

[Start building](https://console.anthropic.com/)Start building

document.addEventListener("DOMContentLoaded", function () { document.querySelectorAll("\[data-toggle-group\]").forEach((section) => { if (section.dataset.scriptInitialized) return; section.dataset.scriptInitialized = "true"; function initializePricingSection(section) { const toggle = section.querySelector('.batch\_toggle\_checkbox'); const priceElements = section.querySelectorAll('\[data-value\]'); const toggleGroup = section.dataset.toggleGroup || 'default'; if (!toggle) return; // Function to update prices within this section only function updatePrices(showDiscount) { priceElements.forEach(element => { const fullPrice = parseFloat(element.dataset.value); if (!isNaN(fullPrice)) { // Add updating class for animation element.classList.add('updating'); // Update price after short delay for smooth transition setTimeout(() => { const newPrice = showDiscount ? fullPrice / 2 : fullPrice; element.textContent = formatPrice(newPrice); // Remove updating class element.classList.remove('updating'); }, 150); } }); } // Initialize prices for this section (start with full prices) updatePrices(toggle.checked); // Handle toggle change for this section toggle.addEventListener('change', function() { const isChecked = this.checked; updatePrices(isChecked); // Announce change to screen readers with section context const sectionName = toggleGroup.replace('-', ' '); const message = isChecked ? \`Batch processing discount applied to ${sectionName}\` : \`Full prices restored for ${sectionName}\`; announceToScreenReader(message); }); // Keyboard support for Enter key toggle.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); this.checked = !this.checked; this.dispatchEvent(new Event('change')); } }); } // Function to format price (customize as needed) function formatPrice(price) { // Check if the original value had 2 decimal places (like 0.80) const str = price.toString(); if (price % 1 === 0) { // Whole numbers return str; } else if (price.toFixed(2) === str || str.match(/\\.\\d{1,2}$/)) { // Original had 1-2 decimal places, maintain 2 decimal format return price.toFixed(2); } else { // Has more precision (like 0.375), keep exact value return str; } } // Screen reader announcement function function announceToScreenReader(message) { const announcement = document.createElement('div'); announcement.setAttribute('aria-live', 'polite'); announcement.setAttribute('aria-atomic', 'true'); announcement.style.position = 'absolute'; announcement.style.left = '-10000px'; announcement.style.width = '1px'; announcement.style.height = '1px'; announcement.style.overflow = 'hidden'; document.body.appendChild(announcement); announcement.textContent = message; // Remove after announcement setTimeout(() => { if (document.body.contains(announcement)) { document.body.removeChild(announcement); } }, 1000); } initializePricingSection(section); }); });

Save 50% with batch processing.

[Learn more](https://docs.claude.com/en/docs/build-with-claude/batch-processing)

Batch processing

### Opus 4.1

Powerful model for complex and creative tasks

Input

$15 / MTok

Output

$75 / MTok

Prompt caching

Write

$18.75 / MTok

Read

$1.50 / MTok

### Sonnet 4.5

Most intelligent model for building agents and coding

Input

Prompts ≤ 200K tokens

$3 / MTok

Prompts > 200K tokens

$6 / MTok

Output

Prompts ≤ 200K tokens

$15 / MTok

Prompts > 200K tokens

$22.50 / MTok

Prompt caching

≤ 200K tokens

Write

$3.75 / MTok

Read

$0.30 / MTok

\> 200K tokens

Write

$7.50 / MTok

Read

$0.60 / MTok

### Haiku 4.5

Fastest, most cost-efficient model

Input

$1 / MTok

Output

$5 / MTok

Prompt Caching

Write

$1.25 / MTok

Read

$0.10 / MTok

Prompt caching pricing reflects 5-minute TTL. Learn about [extended prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching#pricing).

Pricing for tools

Get even more out of Claude with advanced features and capabilities.

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Learn more

[Learn more](https://docs.claude.com/en/docs/about-claude/pricing#specific-tool-pricing)Learn more

#### Web search

Give Claude access to the latest information from the web. Doesn’t include input and output tokens required to process requests.

Cost

$10 / 1K searches

Code execution

Run Python code in a sandboxed environment for advanced data analysis. 50 free hours of usage daily per organization.

Additional hours

$0.05 per hour per container

Service tiers

Balance availability, performance, and predictable costs based on your needs.

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Learn more

[Learn more](https://docs.claude.com/en/api/service-tiers)Learn more

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Contact sales

[Contact sales](/contact-sales)Contact sales

Priority

When time, availability, and predictable pricing are most important

@container (width < 32em) { .c-grid:has(.icon-block\_wrap) { row-gap: 1.5rem; } }

Standard

Default tier for both piloting and scaling everyday use cases

@container (width < 32em) { .c-grid:has(.icon-block\_wrap) { row-gap: 1.5rem; } }

Batch

For asynchronous workloads that can be processed together for better efficiency

@container (width < 32em) { .c-grid:has(.icon-block\_wrap) { row-gap: 1.5rem; } }

Legacy models

.button\_main\_icon { transition: color 300ms ease; } .button\_main\_wrap:hover .button\_main\_icon { color: var(--\_button-style---icon-hover); } .button\_main\_wrap:focus-within .button\_main\_icon { color: var(--\_button-style---text-hover) !important; } .button\_main\_wrap:focus-within { color: var(--\_button-style---text-hover) !important; }

Learn more

[Learn more](https://docs.claude.com/en/docs/about-claude/models/overview)Learn more

document.addEventListener("DOMContentLoaded", function () { document.querySelectorAll("\[data-toggle-group\]").forEach((section) => { if (section.dataset.scriptInitialized) return; section.dataset.scriptInitialized = "true"; function initializePricingSection(section) { const toggle = section.querySelector('.batch\_toggle\_checkbox'); const priceElements = section.querySelectorAll('\[data-value\]'); const toggleGroup = section.dataset.toggleGroup || 'default'; if (!toggle) return; // Function to update prices within this section only function updatePrices(showDiscount) { priceElements.forEach(element => { const fullPrice = parseFloat(element.dataset.value); if (!isNaN(fullPrice)) { // Add updating class for animation element.classList.add('updating'); // Update price after short delay for smooth transition setTimeout(() => { const newPrice = showDiscount ? fullPrice / 2 : fullPrice; element.textContent = formatPrice(newPrice); // Remove updating class element.classList.remove('updating'); }, 150); } }); } // Initialize prices for this section (start with full prices) updatePrices(toggle.checked); // Handle toggle change for this section toggle.addEventListener('change', function() { const isChecked = this.checked; updatePrices(isChecked); // Announce change to screen readers with section context const sectionName = toggleGroup.replace('-', ' '); const message = isChecked ? \`Batch processing discount applied to ${sectionName}\` : \`Full prices restored for ${sectionName}\`; announceToScreenReader(message); }); // Keyboard support for Enter key toggle.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); this.checked = !this.checked; this.dispatchEvent(new Event('change')); } }); } // Function to format price (customize as needed) function formatPrice(price) { // Check if the original value had 2 decimal places (like 0.80) const str = price.toString(); if (price % 1 === 0) { // Whole numbers return str; } else if (price.toFixed(2) === str || str.match(/\\.\\d{1,2}$/)) { // Original had 1-2 decimal places, maintain 2 decimal format return price.toFixed(2); } else { // Has more precision (like 0.375), keep exact value return str; } } // Screen reader announcement function function announceToScreenReader(message) { const announcement = document.createElement('div'); announcement.setAttribute('aria-live', 'polite'); announcement.setAttribute('aria-atomic', 'true'); announcement.style.position = 'absolute'; announcement.style.left = '-10000px'; announcement.style.width = '1px'; announcement.style.height = '1px'; announcement.style.overflow = 'hidden'; document.body.appendChild(announcement); announcement.textContent = message; // Remove after announcement setTimeout(() => { if (document.body.contains(announcement)) { document.body.removeChild(announcement); } }, 1000); } initializePricingSection(section); }); });

Save 50% with batch processing.

[Learn more](https://docs.claude.com/en/docs/build-with-claude/batch-processing)

Batch processing

### Sonnet 4

Input

$3 / MTok

Output

$15 / MTok

Prompt caching

Write

$3.75 / MTok

Read

$0.30 / MTok

### Opus 4

Input

$15 / MTok

Output

$75 / MTok

Prompt caching

Write

$18.75 / MTok

Read

$1.50 / MTok

### Sonnet 3.7

Input

$3 / MTok

Output

$15 / MTok

Prompt caching

Write

$3.75 / MTok

Read

$0.30 / MTok

### Haiku 3.5

Input

$0.80 / MTok

Output

$4 / MTok

Prompt Caching

Write

$1 / MTok

Read

$0.08 / MTok

### Opus 3

Input

$15 / MTok

Output

$75 / MTok

Prompt caching

Write

$18.75 / MTok

Read

$1.50 / MTok

### Haiku 3

Input

$0.25 / MTok

Output

$1.25 / MTok

Prompt caching

Write

$0.30 / MTok

Read

$0.03 / MTok

Prompt caching pricing reflects 5-minute TTL. Learn about [extended prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching#pricing).