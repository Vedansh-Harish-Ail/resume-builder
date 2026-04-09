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
const simpleFields = ['firstName', 'lastName', 'email', 'phone', 'location', 'link', 'github', 'skills', 'certifications', 'summary'];
let state = { experience: [], education: [], projects: [] };

function initApp() {
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



function setEditorField(field, val) {
    localStorage.setItem(`resume_${field}`, val);
    const input = document.querySelector(`[data-sync="${field}"]`);
    if (input) input.value = val;
    updatePreview(field, val);
}

// -------------------------------------------------------------
// REAL AI PDF PARSING LOGIC (Using PDF.js + Backend API)
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
            uploadStatus.innerText = `Calling Gemini API...`;
            const parsedData = await parseResumeWithGemini(extractedText);

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
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strings = textContent.items.map(item => item.str);
        fullText += strings.join(' ') + '\n';
    }
    return fullText;
}

async function parseResumeWithGemini(text) {
    const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return data;
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
        state.experience = data.experience.map((e, idx) => ({ id: Date.now() + idx, ...e }));
        localStorage.setItem('resume_experience', JSON.stringify(state.experience));
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
