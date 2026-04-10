// UI Interaction
function toggleAccordion(header) {
    const item = header.parentElement;
    const content = item.querySelector('.accordion-content');
    const icon = header.querySelector('.fa-chevron-down');
    if (content.style.display === "block") {
        content.style.display = "none";
        icon.style.transform = "rotate(0deg)";
    } else {
        content.style.display = "block";
        icon.style.transform = "rotate(180deg)";
    }
}

// Data Handling
const simpleFields = ['firstName', 'lastName', 'email', 'phone', 'location', 'link', 'github', 'skills', 'certifications', 'summary', 'openAIKey', 'vipPassword'];
let state = { experience: [], education: [], projects: [] };

function initApp() {
    // Note: To use AI features, please paste your OpenAI API key in the 'AI Parser Settings' section of the editor.
    // This key is stored securely in your browser's local storage and never sent to our servers except for parsing.

    simpleFields.forEach(field => {
        const input = document.querySelector(`[data-sync="${field}"]`);
        const val = localStorage.getItem(`resume_${field}`) || '';
        if (input) {
            input.value = val;
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                localStorage.setItem(`resume_${field}`, value);
                updatePreview(field, value);
            });
        }
        updatePreview(field, val);
    });

    const lsExp = localStorage.getItem('resume_experience');
    if (lsExp) state.experience = JSON.parse(lsExp);
    else state.experience = [{ id: Date.now(), role: '', company: '', date: '', location: '', desc: '' }];

    const lsProj = localStorage.getItem('resume_projects');
    if (lsProj) state.projects = JSON.parse(lsProj);
    else state.projects = [{ id: Date.now() + 1, role: '', company: '', date: '', desc: '' }];

    const lsEdu = localStorage.getItem('resume_education');
    if (lsEdu) state.education = JSON.parse(lsEdu);
    else state.education = [{ id: Date.now() + 2, degree: '', school: '', date: '' }];

    // Render Lists
    renderDynamicList('experience');
    renderDynamicList('projects');
    renderDynamicList('education');

    // AI Settings UI Enhancements
    setupAISettings();
}

function setupAISettings() {
    const toggleBtn = document.getElementById('toggleKeyVisibility');
    const keyInput = document.getElementById('inpOpenAIKey');
    if (toggleBtn && keyInput) {
        toggleBtn.addEventListener('click', () => {
            const type = keyInput.getAttribute('type') === 'password' ? 'text' : 'password';
            keyInput.setAttribute('type', type);
            toggleBtn.classList.toggle('fa-eye');
            toggleBtn.classList.toggle('fa-eye-slash');
        });
    }

    // Add "AI Active" badge if key/VIP exists
    updateAIBadges();
    const aiInputs = document.querySelectorAll('#inpOpenAIKey, #inpVipPassword');
    aiInputs.forEach(input => input.addEventListener('input', updateAIBadges));

    // Summary Generation
    document.getElementById('btnAiSummary').addEventListener('click', generateSummary);
}

async function generateSummary() {
    const btn = document.getElementById('btnAiSummary');
    const originalText = btn.innerHTML;
    const key = localStorage.getItem('resume_openAIKey');
    const vip = localStorage.getItem('resume_vipPassword');
    
    if (!key && !vip) {
        alert("Please provide an API Key or VIP Password in settings first.");
        toggleAccordion(document.querySelector('#aiSettingsItem .accordion-header'));
        return;
    }

    // Collect context for summary
    const firstName = localStorage.getItem('resume_firstName') || '';
    const skills = localStorage.getItem('resume_skills') || '';
    const exp = state.experience.map(e => `${e.role} at ${e.company}`).join(', ');
    const context = `Name: ${firstName}, Skills: ${skills}, Experience: ${exp}`;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Writing...';

    try {
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate_summary', context, openAIKey: key, vipPassword: vip })
        });
        const data = await response.json();
        if (data.result) {
            setEditorField('summary', data.result);
        } else {
            alert("Generation failed: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        alert("Network error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function enhanceWithAI(btn, type) {
    const originalText = btn.innerHTML;
    const wrapper = btn.closest('.ai-input-wrapper');
    const textarea = wrapper.querySelector('textarea');
    const text = textarea.value.trim();
    const key = localStorage.getItem('resume_openAIKey');
    const vip = localStorage.getItem('resume_vipPassword');

    if (!text) {
        alert("Please enter some points first to enhance.");
        return;
    }

    if (!key && !vip) {
        alert("Please provide an API Key or VIP Password in settings first.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'enhance_bullets', text, openAIKey: key, vipPassword: vip })
        });
        const data = await response.json();
        if (data.result) {
            textarea.value = data.result;
            // Trigger storage sync
            const itemId = btn.closest('[data-id]').dataset.id;
            updateDynamicItem(type, parseInt(itemId), 'desc', data.result);
        } else {
            alert("Enhancement failed: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        alert("Network error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function updateAIBadges() {
    const key = localStorage.getItem('resume_openAIKey');
    const vip = localStorage.getItem('resume_vipPassword');
    const header = document.querySelector('#aiSettingsItem h3');
    const uploadTitle = document.querySelector('#uploadModal h2');
    
    if (key || vip) {
        if (!header.querySelector('.ai-badge')) {
            header.innerHTML += '<span class="ai-badge">Active</span>';
        }
        if (uploadTitle && !uploadTitle.querySelector('.ai-badge')) {
            uploadTitle.innerHTML += '<span class="ai-badge">AI Enhanced</span>';
        }
    } else {
        const badges = document.querySelectorAll('.ai-badge');
        badges.forEach(b => b.remove());
    }
}

function updatePreview(field, value) {
    const outElem = document.getElementById(`out${capitalize(field)}`);
    if (outElem) {
        if (field === 'summary') {
            outElem.innerText = value;
            const summarySec = document.getElementById('sectionSummary');
            if (summarySec) summarySec.style.display = value.trim() ? 'block' : 'none';
        }
        else if (field === 'skills') {
            outElem.innerText = value;
            checkSkillsVisibility();
        }
        else if (field === 'certifications') {
            const certWrap = document.getElementById('certificationsWrapper');
            outElem.innerText = value;
            if (certWrap) certWrap.style.display = value.trim() ? 'block' : 'none';
            checkSkillsVisibility();
        }
        else {
            outElem.innerText = value;
        }
    }
    updateContactDividers();
}

function checkSkillsVisibility() {
    const skills = localStorage.getItem('resume_skills') || '';
    const certs = localStorage.getItem('resume_certifications') || '';
    const section = document.getElementById('sectionSkills');
    if (section) {
        section.style.display = (skills.trim() || certs.trim()) ? 'block' : 'none';
    }
}

function updateContactDividers() {
    const email = document.getElementById('outEmail').innerText.trim();
    const phone = document.getElementById('outPhone').innerText.trim();
    const loc = document.getElementById('outLocation').innerText.trim();
    const lnk = document.getElementById('outLink').innerText.trim();
    const git = document.getElementById('outGithub').innerText.trim();

    document.getElementById('div1').style.display = (email && phone) ? 'inline' : 'none';
    document.getElementById('div2').style.display = ((email || phone) && loc) ? 'inline' : 'none';
    document.getElementById('div3').style.display = ((email || phone || loc) && lnk) ? 'inline' : 'none';
    document.getElementById('div4').style.display = ((email || phone || loc || lnk) && git) ? 'inline' : 'none';
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function renderDynamicList(type) {
    const container = document.getElementById(`${type}List`);
    const previewContainer = document.getElementById(`out${capitalize(type)}List`);
    container.innerHTML = '';
    previewContainer.innerHTML = '';

    const list = state[type];
    let templateId = 'tplExperience';
    if (type === 'education') templateId = 'tplEducation';
    if (type === 'projects') templateId = 'tplProject';

    const template = document.getElementById(templateId);
    let hasData = false;

    list.forEach(item => {
        const clone = template.content.cloneNode(true);
        const wrapper = clone.firstElementChild;
        wrapper.dataset.id = item.id;

        // Drag and Drop Logic
        wrapper.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({ type, id: item.id }));
            wrapper.classList.add('dragging');
        });
        wrapper.addEventListener('dragend', () => {
            wrapper.classList.remove('dragging');
            document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
        });
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.classList.add('drop-target');
        });
        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('drop-target');
        });
        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('drop-target');
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);
            if (data.type === type && data.id !== item.id) {
                const arr = state[type];
                const fromIdx = arr.findIndex(i => i.id === data.id);
                const toIdx = arr.findIndex(i => i.id === item.id);
                const [movedItem] = arr.splice(fromIdx, 1);
                arr.splice(toIdx, 0, movedItem);
                localStorage.setItem(`resume_${type}`, JSON.stringify(arr));
                renderDynamicList(type);
            }
        });

        const inputs = wrapper.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            const field = input.dataset.field;
            input.value = item[field] || '';
            input.addEventListener('input', (e) => {
                updateDynamicItem(type, item.id, field, e.target.value);
            });
        });
        container.appendChild(wrapper);

        if (type === 'experience') {
            if (item.role || item.company) {
                hasData = true;
                const descLines = item.desc ? item.desc.split('\n').filter(l => l.trim()).map(l => {
                    return `<li>${l.replace(/^[-•*]\s*/, '')}</li>`;
                }).join('') : '';
                previewContainer.innerHTML += `
                    <div class="exp-item-out">
                        <div class="item-row">
                            <span class="item-title-org">${item.company}</span>
                            <span>${item.location ? '<span class="item-location">' + item.location + '</span>' : ''}</span>
                        </div>
                        <div class="item-row">
                            <span class="item-role-italic">${item.role}</span>
                            <span class="item-date-right">${item.date || ''}</span>
                        </div>
                        <div class="item-out-desc">
                            <ul>${descLines}</ul>
                        </div>
                    </div>`;
            }
        }
        else if (type === 'projects') {
            if (item.role || item.company) {
                hasData = true;
                const descLines = item.desc ? item.desc.split('\n').filter(l => l.trim()).map(l => {
                    return `<li>${l.replace(/^[-•*]\s*/, '')}</li>`;
                }).join('') : '';
                previewContainer.innerHTML += `
                    <div class="exp-item-out">
                        <div class="item-row">
                            <span class="item-title-org">${item.role}</span>
                            <span class="item-date-right">${item.date || ''}</span>
                        </div>
                        <div class="item-row">
                            <span class="item-role-italic">${item.company}</span>
                        </div>
                        <div class="item-out-desc">
                            <ul>${descLines}</ul>
                        </div>
                    </div>`;
            }
        }
        else if (type === 'education') {
            if (item.degree || item.school) {
                hasData = true;
                previewContainer.innerHTML += `
                    <div class="edu-item-out">
                        <div class="item-row">
                            <span class="item-title-org">${item.school}</span>
                            <span class="item-location">${item.location || ''}</span>
                        </div>
                        <div class="item-row">
                            <span class="item-role-italic">${item.degree}</span>
                            <span class="item-date-right">${item.date || ''}</span>
                        </div>
                    </div>`;
            }
        }
    });

    document.getElementById(`section${capitalize(type)}`).style.display = hasData ? 'block' : 'none';
}

function updateDynamicItem(type, id, field, value) {
    const item = state[type].find(i => i.id === id);
    if (item) {
        item[field] = value;
        localStorage.setItem(`resume_${type}`, JSON.stringify(state[type]));
        renderDynamicList(type);
    }
}

function addExperience() {
    state.experience.push({ id: Date.now(), role: '', company: '', date: '', location: '', desc: '' });
    localStorage.setItem('resume_experience', JSON.stringify(state.experience));
    renderDynamicList('experience');
}

function addProject() {
    state.projects.push({ id: Date.now(), role: '', company: '', date: '', desc: '' });
    localStorage.setItem('resume_projects', JSON.stringify(state.projects));
    renderDynamicList('projects');
}

function addEducation() {
    state.education.push({ id: Date.now(), degree: '', school: '', date: '', location: '' });
    localStorage.setItem('resume_education', JSON.stringify(state.education));
    renderDynamicList('education');
}

function removeDynamicItem(btn, type) {
    const wrapper = btn.closest('[data-id]');
    const id = parseInt(wrapper.dataset.id);
    state[type] = state[type].filter(i => i.id !== id);
    localStorage.setItem(`resume_${type}`, JSON.stringify(state[type]));
    renderDynamicList(type);
}

document.getElementById('btnDownload').addEventListener('click', () => { window.print(); });

function resetAllData() {
    if (!confirm('Are you sure you want to clear all resume data? This cannot be undone.')) return;
    const keys = Object.keys(localStorage).filter(k => k.startsWith('resume_'));
    keys.forEach(k => localStorage.removeItem(k));
    location.reload();
}



function setEditorField(field, val) {
    localStorage.setItem(`resume_${field}`, val);
    const input = document.querySelector(`[data-sync="${field}"]`);
    if (input) input.value = val;
    updatePreview(field, val);
}

// -------------------------------------------------------------
// PDF Import (Offline Parsing)
// -------------------------------------------------------------
const fileUpload = document.getElementById('fileUpload');
const uploadModal = document.getElementById('uploadModal');
const uploadStatus = document.getElementById('uploadStatusText');
const uploadProgress = document.getElementById('uploadProgressFill');
const uploadStatusArea = document.getElementById('uploadStatusArea');

document.getElementById('btnUploadResume').addEventListener('click', () => {
    uploadModal.classList.add('show');
});

document.getElementById('closeUploadModal').addEventListener('click', () => {
    uploadModal.classList.remove('show');
});

document.getElementById('btnConfirmUpload').addEventListener('click', () => {
    fileUpload.click();
});

fileUpload.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        uploadStatusArea.style.display = 'block';
        const file = e.target.files[0];
        try {
            uploadProgress.style.width = '20%';
            uploadStatus.innerText = `Extracting pure text using PDF.js...`;
            const extractedText = await extractTextFromPDF(file);

            uploadProgress.style.width = '50%';
            uploadStatus.innerText = `Parsing resume locally...`;
            const parsedData = await parseResume(extractedText);

            uploadProgress.style.width = '90%';
            uploadStatus.innerText = `Mapping variables to 100-Score Template...`;

            applyParsedData(parsedData);

            uploadProgress.style.width = '100%';
            setTimeout(() => {
                uploadModal.classList.remove('show');
                uploadStatusArea.style.display = 'none';
                fileUpload.value = '';
            }, 1000);

        } catch (error) {
            alert("Error parsing document: " + error.message);
            uploadStatusArea.style.display = 'none';
        }
    }
});

async function extractTextFromPDF(file) {
    // Uses Mozilla PDF.js from CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageTexts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pageTexts.push(convertPdfItemsToStructuredText(textContent.items));
    }

    return normalizeWhitespace(pageTexts.filter(Boolean).join('\n\n'));
}

async function parseResume(text) {
    const key = localStorage.getItem('resume_openAIKey');
    const vip = localStorage.getItem('resume_vipPassword');

    if (key || vip) {
        uploadProgress.style.width = '70%';
        uploadStatus.innerText = `AI-Engine: Structuring Resume...`;
        try {
            const response = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text, 
                    openAIKey: key, 
                    vipPassword: vip 
                })
            });
            if (response.ok) {
                const data = await response.json();
                return normalizeParsedData(data);
            }
            const errData = await response.json();
            console.warn("AI Parsing Error:", errData.error);
            uploadStatus.innerText = `AI Error: Falling back to local...`;
        } catch (error) {
            console.error("Fetch Error:", error);
            uploadStatus.innerText = `Network Error: Falling back to local...`;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    // Offline-only: no API calls, no keys, no quotas.
    uploadProgress.style.width = '70%';
    uploadStatus.innerText = `Local Parser: Extracting sections...`;
    return parseResumeFallback(text);
}

function parseResumeFallback(text) {
    const preparedText = prepareResumeText(text);
    const cleanedText = normalizeWhitespace(preparedText);
    const lines = preparedText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const email = matchFirst(cleanedText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phone = matchFirst(cleanedText, /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
    const github = matchFirst(cleanedText, /https?:\/\/(?:www\.)?github\.com\/[^\s|,;]+/i);
    const linkedin = matchFirst(cleanedText, /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s|,;]+/i);
    const otherUrl = matchFirst(cleanedText, /https?:\/\/[^\s|,;]+/i);
    const chosenLink = linkedin || (otherUrl && otherUrl !== github ? otherUrl : '');

    const candidateName = inferName(lines, email);
    const nameParts = splitName(candidateName);
    const skillsSection = extractSection(preparedText, ['skills', 'technical skills', 'key skills', 'core competencies', 'technical proficiencies'], ['certifications', 'experience', 'projects', 'education']);
    const certSection = extractSection(preparedText, ['certifications', 'licenses', 'certifications and licenses'], ['skills', 'experience', 'projects', 'education']);
    const summarySection = extractSection(preparedText, ['summary', 'professional summary', 'profile', 'objective', 'about'], ['experience', 'projects', 'education', 'skills', 'certifications']);
    const experienceSection = extractSection(preparedText, ['experience', 'professional experience', 'work experience', 'employment history', 'work history'], ['projects', 'education', 'skills', 'certifications']);
    const projectsSection = extractSection(preparedText, ['projects', 'personal projects', 'academic projects'], ['education', 'skills', 'certifications', 'experience']);
    const educationSection = extractSection(preparedText, ['education', 'academic background', 'education and training'], ['skills', 'certifications', 'projects', 'experience']);

    return normalizeParsedData({
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email,
        phone,
        location: inferLocation(lines, email, phone),
        link: chosenLink,
        github,
        skills: normalizeListSection(skillsSection),
        certifications: normalizeListSection(certSection),
        summary: pickSummary(summarySection, lines),
        experience: parseSimpleEntries(experienceSection, 'experience'),
        projects: parseSimpleEntries(projectsSection, 'projects'),
        education: parseEducationEntries(educationSection)
    });
}

function normalizeParsedData(data) {
    return {
        firstName: safeString(data.firstName),
        lastName: safeString(data.lastName),
        email: safeString(data.email),
        phone: safeString(data.phone),
        location: safeString(data.location),
        link: safeString(data.link),
        github: safeString(data.github),
        skills: safeString(data.skills),
        certifications: safeString(data.certifications),
        summary: safeString(data.summary),
        experience: Array.isArray(data.experience) ? data.experience.map(item => ({
            role: safeString(item.role),
            company: safeString(item.company),
            date: safeString(item.date),
            location: safeString(item.location),
            desc: safeString(item.desc)
        })) : [],
        projects: Array.isArray(data.projects) ? data.projects.map(item => ({
            role: safeString(item.role),
            company: safeString(item.company),
            date: safeString(item.date),
            desc: safeString(item.desc)
        })) : [],
        education: Array.isArray(data.education) ? data.education.map(item => ({
            degree: safeString(item.degree),
            school: safeString(item.school),
            date: safeString(item.date),
            location: safeString(item.location)
        })) : []
    };
}

function parseSimpleEntries(sectionText, type) {
    if (!sectionText) return [];

    const blocks = splitEntryBlocks(sectionText).slice(0, 8);

    return blocks.map(block => {
        const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const bulletLines = lines.filter(line => /^[-*•]/.test(line));
        const contentLines = lines.filter(line => !/^[-*•]/.test(line));
        const date = extractDateRange(block);
        const location = extractLocationFromBlock(block);
        const cleanedLines = contentLines
            .map(line => line.replace(date, '').replace(location, '').replace(/\s{2,}/g, ' ').trim())
            .filter(Boolean);
        const headline = cleanedLines[0] || '';
        const subline = cleanedLines[1] || '';
        const desc = bulletLines.length
            ? bulletLines.join('\n')
            : inferBulletLines(lines.slice(2)).join('\n');

        if (type === 'projects') {
            return {
                role: headline,
                company: subline,
                date,
                desc
            };
        }

        const splitHeadline = splitRoleCompany(headline, subline);
        return {
            role: splitHeadline.role,
            company: splitHeadline.company,
            date,
            location,
            desc
        };
    }).filter(item => Object.values(item).some(value => safeString(value)));
}

function parseEducationEntries(sectionText) {
    if (!sectionText) return [];

    return splitEntryBlocks(sectionText)
        .map(block => block.trim())
        .filter(Boolean)
        .slice(0, 6)
        .map(block => {
            const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            const date = extractDateRange(block);
            const location = extractLocationFromBlock(block);
            const cleanedLines = lines
                .map(line => line.replace(date, '').replace(location, '').replace(/\s{2,}/g, ' ').trim())
                .filter(Boolean);
            return {
                school: cleanedLines[0] || '',
                degree: cleanedLines[1] || '',
                date,
                location
            };
        })
        .filter(item => item.school || item.degree);
}

function extractSection(text, headings, stopHeadings) {
    const lines = text.split(/\r?\n/);
    const normalizedHeadings = headings.map(normalizeHeading);
    const normalizedStopHeadings = stopHeadings.map(normalizeHeading);
    let startIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const normalized = normalizeHeading(lines[i]);
        if (normalizedHeadings.includes(normalized)) {
            startIndex = i + 1;
            break;
        }
    }

    if (startIndex === -1) return '';

    const sectionLines = [];
    for (let i = startIndex; i < lines.length; i++) {
        const normalized = normalizeHeading(lines[i]);
        if (normalized && normalizedStopHeadings.includes(normalized)) break;
        sectionLines.push(lines[i]);
    }

    return sectionLines.join('\n').trim();
}

function normalizeHeading(line) {
    return safeString(line).toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeListSection(sectionText) {
    if (!sectionText) return '';
    return sectionText
        .replace(/\r/g, '')
        .split(/\n|,|•|·|\||\u2022/)
        .map(part => part.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean)
        .join(', ');
}

function inferName(lines, email) {
    for (const line of lines.slice(0, 5)) {
        if (!line || line.length > 60) continue;
        if (email && line.includes(email)) continue;
        if (/\d/.test(line)) continue;
        if (/resume|curriculum|vitae|summary|profile/i.test(line)) continue;
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length >= 2 && words.length <= 4) {
            return line;
        }
    }
    return '';
}

function splitName(fullName) {
    const parts = safeString(fullName).split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || '',
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : ''
    };
}

function inferLocation(lines, email, phone) {
    for (const line of lines.slice(0, 8)) {
        if (!line || (email && line.includes(email)) || (phone && line.includes(phone))) continue;
        if (/https?:\/\//i.test(line)) continue;
        if (/linkedin|github/i.test(line)) continue;
        if (/^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/.test(line)) return line;
    }
    return '';
}

function extractDateRange(text) {
    return matchFirst(
        text,
        /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|\d{1,2})[a-z]*[\/\s.-]*\d{2,4}\s*(?:-|to|–)\s*(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|\d{1,2})[a-z]*[\/\s.-]*\d{2,4}|\d{4})|\b(?:19|20)\d{2}\s*(?:-|to|–)\s*(?:Present|Current|\d{4})/i
    );
}

function extractLocationFromBlock(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
        if (/^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/.test(line)) return line;
    }
    return '';
}

function normalizeWhitespace(value) {
    return safeString(value).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function safeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function matchFirst(text, regex) {
    const match = safeString(text).match(regex);
    return match ? match[0].trim() : '';
}

function convertPdfItemsToStructuredText(items) {
    const rows = [];

    items.forEach(item => {
        const text = safeString(item.str);
        if (!text) return;

        const x = Number(item.transform?.[4] || 0);
        const y = Number(item.transform?.[5] || 0);
        const fontHeight = Number(item.height || item.transform?.[0] || 0);
        const roundedY = Math.round(y);

        let targetRow = rows.find(row => Math.abs(row.y - roundedY) <= 3);
        if (!targetRow) {
            targetRow = { y: roundedY, fontHeight, items: [] };
            rows.push(targetRow);
        }

        targetRow.items.push({ text, x });
    });

    rows.sort((a, b) => b.y - a.y);

    const lines = [];
    let lastY = null;

    rows.forEach(row => {
        row.items.sort((a, b) => a.x - b.x);
        const line = buildLineFromPdfRow(row.items);
        if (!line) return;

        if (lastY !== null) {
            const gap = Math.abs(lastY - row.y);
            if (gap > Math.max(14, row.fontHeight * 1.25)) {
                lines.push('');
            }
        }

        lines.push(line);
        lastY = row.y;
    });

    return lines.join('\n');
}

function buildLineFromPdfRow(items) {
    let line = '';
    let previousX = null;

    items.forEach(item => {
        const piece = item.text.replace(/\s+/g, ' ').trim();
        if (!piece) return;

        if (previousX !== null && item.x - previousX > 18 && !line.endsWith(' ')) {
            line += ' ';
        } else if (line && !line.endsWith(' ')) {
            line += ' ';
        }

        line += piece;
        previousX = item.x + piece.length * 4;
    });

    return line.replace(/\s+/g, ' ').trim();
}

function prepareResumeText(text) {
    return safeString(text)
        .replace(/\u2022/g, '•')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n +/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function splitEntryBlocks(sectionText) {
    const explicitBlocks = sectionText
        .split(/\n\s*\n/)
        .map(block => block.trim())
        .filter(Boolean);

    if (explicitBlocks.length > 1) return explicitBlocks;

    const lines = sectionText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const blocks = [];
    let current = [];

    for (const line of lines) {
        const shouldStartNewBlock =
            current.length > 0 &&
            looksLikeEntryStart(line) &&
            current.some(existing => /^[-*•]/.test(existing) || extractDateRange(existing));

        if (shouldStartNewBlock) {
            blocks.push(current.join('\n'));
            current = [];
        }

        current.push(line);
    }

    if (current.length) blocks.push(current.join('\n'));
    return blocks.filter(Boolean);
}

function looksLikeEntryStart(line) {
    if (!line) return false;
    if (/^[-*•]/.test(line)) return false;
    if (normalizeHeading(line).length <= 1) return false;
    if (/^(experience|projects|education|skills|certifications|summary|profile|objective)$/i.test(line)) return false;
    if (extractDateRange(line)) return false;

    const words = line.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 10;
}

function inferBulletLines(lines) {
    return lines
        .map(line => line.trim())
        .filter(line => line && !extractDateRange(line) && !/^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/.test(line))
        .map(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('*') ? line : `- ${line}`);
}

function splitRoleCompany(headline, fallbackLine) {
    const separators = [' | ', ' - ', ' @ ', ' at ', ' – '];

    for (const separator of separators) {
        if (headline.includes(separator)) {
            const [left, right] = headline.split(separator).map(part => part.trim());
            if (left && right) {
                if (separator.trim() === 'at' || separator.includes('@')) {
                    return { role: left, company: right };
                }
                return { company: left, role: right };
            }
        }
    }

    if (fallbackLine) {
        return { company: headline, role: fallbackLine };
    }

    return { company: headline, role: '' };
}

function pickSummary(summarySection, lines) {
    if (summarySection) return normalizeWhitespace(summarySection);

    const candidates = lines
        .filter(line =>
            line.length > 40 &&
            !extractDateRange(line) &&
            !/^[-*•]/.test(line) &&
            !line.includes('@') &&
            !/linkedin|github|http/i.test(line)
        )
        .slice(0, 3);

    return normalizeWhitespace(candidates.join(' '));
}

function applyParsedData(data) {
    if (data.firstName) setEditorField('firstName', data.firstName);
    if (data.lastName) setEditorField('lastName', data.lastName);
    if (data.email) setEditorField('email', data.email);
    if (data.phone) setEditorField('phone', data.phone);
    if (data.location) setEditorField('location', data.location);
    if (data.link) setEditorField('link', data.link);
    if (data.skills) setEditorField('skills', data.skills);
    if (data.certifications) setEditorField('certifications', data.certifications);
    if (data.summary) setEditorField('summary', data.summary);

    if (data.experience && data.experience.length > 0) {
        // Post-parsing validation: move items that look like projects to the projects array
        const realExperience = [];
        const detectedProjects = [];

        data.experience.forEach(item => {
            const isProject = /project|leadership|personal|academic/i.test(item.company || '') || 
                              /project|leadership|personal|academic/i.test(item.role || '');
            
            if (isProject) {
                detectedProjects.push(item);
            } else {
                realExperience.push(item);
            }
        });

        state.experience = realExperience.map((e, idx) => ({ id: Date.now() + idx, ...e }));
        localStorage.setItem('resume_experience', JSON.stringify(state.experience));

        if (detectedProjects.length > 0) {
            const existingProjects = data.projects || [];
            data.projects = [...existingProjects, ...detectedProjects];
        }
    }

    if (data.projects && data.projects.length > 0) {
        state.projects = data.projects.map((p, idx) => ({ id: Date.now() + 100 + idx, ...p }));
        localStorage.setItem('resume_projects', JSON.stringify(state.projects));
    }

    if (data.education && data.education.length > 0) {
        state.education = data.education.map((e, idx) => ({ id: Date.now() + 200 + idx, ...e }));
        localStorage.setItem('resume_education', JSON.stringify(state.education));
    }

    renderDynamicList('experience');
    renderDynamicList('projects');
    renderDynamicList('education');
}

// Kickoff
window.addEventListener('DOMContentLoaded', initApp);
