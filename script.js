function toggleTheme() {
    const body = document.body;
    const icon = document.querySelector('#theme-toggle span');
    
    if (body.getAttribute('data-theme') === 'light') {
        body.removeAttribute('data-theme');
        icon.textContent = 'light_mode';
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        icon.textContent = 'dark_mode';
        localStorage.setItem('theme', 'light');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.querySelector('#theme-toggle span');
    if (savedTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        icon.textContent = 'dark_mode';
    }
});

const endpoints = {
    'boxeadores-list': { 
        title: 'Listar Boxeadores', method: 'GET', url: '/v1/boxeadores', icon: 'list_alt' 
    },
    'boxeadores-get': { 
        title: 'Buscar Boxeador', method: 'GET', url: '/v1/boxeadores/{id}', inputs: ['id'], icon: 'person_search' 
    },
    'boxeadores-search': { 
        title: 'Pesquisar Boxeador', method: 'GET', url: '/v1/boxeadores/search', inputs: ['q'], icon: 'search' 
    },
    'boxeadores-post': { 
        title: 'Criar Boxeador', method: 'POST', url: '/v1/boxeadores', body: true, idempotency: true, icon: 'person_add',
        example: { "nome": "Mike Tyson", "idade": 58, "categoria": { "id": 1 } } 
    },
    'boxeadores-put': { 
        title: 'Atualizar Boxeador', method: 'PUT', url: '/v1/boxeadores/{id}', inputs: ['id'], body: true, idempotency: true, icon: 'edit',
        example: { "nome": "Mike Tyson Updated", "idade": 59, "categoria": { "id": 1 } }
    },
    'boxeadores-delete': { 
        title: 'Deletar Boxeador', method: 'DELETE', url: '/v1/boxeadores/{id}', inputs: ['id'], idempotency: true, icon: 'delete' 
    },

    'lutas-list': { 
        title: 'Listar Lutas', method: 'GET', url: '/v1/lutas', icon: 'sports_kabaddi' 
    },
    'lutas-post': { 
        title: 'Agendar Luta', method: 'POST', url: '/v1/lutas', body: true, idempotency: true, icon: 'calendar_add_on',
        example: { "dataLuta": "2024-12-25", "boxeador1": { "id": 1 }, "boxeador2": { "id": 2 }, "categoria": { "id": 1 }, "resultado": "Pendente" } 
    },
    'lutas-delete': { 
        title: 'Cancelar Luta', method: 'DELETE', url: '/v1/lutas/{id}', inputs: ['id'], idempotency: true, icon: 'cancel' 
    },

    'categorias-list': { 
        title: 'Listar Categorias', method: 'GET', url: '/v1/categorias', icon: 'category' 
    },
    'categorias-post': { 
        title: 'Criar Categoria', method: 'POST', url: '/v1/categorias', body: true, icon: 'add_circle', example: { "nome": "Peso Pesado" } 
    },
};

let currentKey = null;

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function loadEndpoint(key) {
    currentKey = key;
    const config = endpoints[key];
    
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('endpoint-panel').classList.remove('hidden');
    document.getElementById('response-container').classList.add('hidden');
    
    resetCooldownUI();
    document.getElementById('id-preview-container').classList.add('hidden');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.closest('.nav-btn').classList.add('active');

    document.getElementById('page-title').innerText = config.title;
    document.getElementById('page-icon').innerText = config.icon;
    document.getElementById('page-url').innerText = config.url;
    
    const badge = document.getElementById('page-method');
    badge.className = `badge-method ${config.method.toLowerCase()}`;
    badge.innerText = config.method;

    const mainCard = document.getElementById('main-card');
    mainCard.className = `raw-card ${config.method.toLowerCase()}`;

    const container = document.getElementById('dynamic-inputs');
    container.innerHTML = '';
    let html = '<div class="input-grid">';

    if (config.inputs) {
        config.inputs.forEach(input => {
            html += `
            <div class="field-group">
                <label class="field-label">${input.toUpperCase()}</label>
                <input type="text" id="input-${input}" class="raw-input" placeholder="Digite o valor...">
            </div>`;
        });
    }

    if (config.idempotency) {
        const keyVal = 'key-' + Math.random().toString(36).substr(2, 9);
        html += `
        <div class="field-group">
            <label class="field-label">X-Idempotency-Key (Auto)</label>
            <input type="text" id="input-idempotency" class="raw-input" value="${keyVal}" readonly style="opacity:0.5">
        </div>`;
    }
    html += '</div>';

    if (config.body) {
        html += `
        <div class="field-group">
            <label class="field-label">REQUEST BODY (JSON)</label>
            <textarea id="input-body" class="raw-textarea">${JSON.stringify(config.example, null, 4)}</textarea>
        </div>`;
    }

    container.innerHTML = html;

    if ((config.method === 'DELETE' || config.method === 'PUT') && config.inputs && config.inputs.includes('id')) {
        const idInput = document.getElementById('input-id');
        if (idInput) {
            idInput.addEventListener('input', debounce(async (e) => {
                if (currentKey !== key) return;
                const id = e.target.value;
                if (!id) {
                    document.getElementById('id-preview-container').classList.add('hidden');
                    return;
                }
                await fetchPreview(id, key);
            }, 500));
        }
    }
}

async function fetchPreview(id, currentEndpointKey) {
    if (currentKey !== currentEndpointKey) return;

    const previewContainer = document.getElementById('id-preview-container');
    const previewBox = document.getElementById('id-preview-box');
    const idValSpan = document.getElementById('preview-id-val');

    idValSpan.innerText = id;
    previewContainer.classList.remove('hidden');
    previewBox.className = 'preview-box'; 
    previewBox.innerHTML = '<span class="material-symbols-rounded spin">sync</span> Buscando dados...';

    let getKey = currentEndpointKey.replace('-delete', '-get').replace('-put', '-get');
    let getUrl = '';
    if (endpoints[getKey]) {
        getUrl = endpoints[getKey].url;
    } else {
        getUrl = endpoints[currentEndpointKey].url;
    }

    const baseUrl = document.getElementById('api-url').value.replace(/\/$/, "");
    const url = baseUrl + getUrl.replace('{id}', id);

    try {
        const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
        
        if (currentKey !== currentEndpointKey) return;

        if (res.ok) {
            const data = await res.json();
            previewBox.classList.add('success');
            previewBox.innerText = JSON.stringify(data, null, 2);
        } else if (res.status === 404) {
            previewBox.classList.add('error');
            previewBox.innerHTML = `<span class="material-symbols-rounded" style="margin-right:8px">error</span> Item não encontrado (404)`;
        } else {
            previewBox.classList.add('error');
            previewBox.innerHTML = `Erro ao buscar preview (${res.status})`;
        }
    } catch (err) {
        if (currentKey !== currentEndpointKey) return;
        previewBox.classList.add('error');
        previewBox.innerHTML = `Erro de conexão no preview`;
    }
}


function resetCooldownUI() {
    document.getElementById('btn-execute').classList.remove('hidden');
    document.getElementById('cooldown-ui').classList.add('hidden');
}

function startCooldown() {
    const btn = document.getElementById('btn-execute');
    const ui = document.getElementById('cooldown-ui');
    const bar = document.getElementById('cooldown-bar');
    const timer = document.getElementById('cooldown-timer');
    
    btn.classList.add('hidden');
    ui.classList.remove('hidden');
    
    let timeLeft = 60;
    bar.style.width = '100%'; 
    timer.innerText = `${timeLeft}s`;

    const interval = setInterval(() => {
        timeLeft--;
        timer.innerText = `${timeLeft}s`;
        bar.style.width = `${(timeLeft / 60) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(interval);
            resetCooldownUI();
        }
    }, 1000);
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function closeModalOnClickOutside(event, modalId) {
    if (event.target.id === modalId) {
        closeModal(modalId);
    }
}

async function sendRequest() {
    const config = endpoints[currentKey];
    const baseUrl = document.getElementById('api-url').value.replace(/\/$/, "");
    let url = baseUrl + config.url;

    if (config.inputs) {
        config.inputs.forEach(input => {
            const val = document.getElementById(`input-${input}`).value;
            if (input === 'q') url += `?q=${val}`;
            else url = url.replace(`{${input}}`, val);
        });
    }

    const options = {
        method: config.method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (config.idempotency) {
        options.headers['X-Idempotency-Key'] = document.getElementById('input-idempotency').value;
    }

    if (config.body) {
        try {
            const bodyElement = document.getElementById('input-body');
            if (!bodyElement) throw new Error("Campo de texto não encontrado");
            
            const bodyRaw = bodyElement.value;
            options.body = JSON.stringify(JSON.parse(bodyRaw));
        } catch (e) {
            showModal('error-modal');
            return;
        }
    }

    const respContainer = document.getElementById('response-container');
    const output = document.getElementById('response-output');
    const indicator = document.getElementById('status-indicator');
    
    respContainer.classList.remove('hidden');
    output.innerText = "Carregando...";
    
    try {
        const res = await fetch(url, options);
        const text = await res.text();
        
        indicator.innerText = `${res.status} ${res.statusText}`;
        indicator.className = 'status-indicator';
        indicator.classList.remove('status-2xx', 'status-4xx', 'status-5xx');

        if (res.ok) {
            indicator.classList.add('status-2xx');
            
            if (config.method === 'POST' && (res.status === 200 || res.status === 201)) {
                showModal('success-modal');
            }

        } else if (res.status === 429) {
            indicator.classList.add('status-5xx');
            startCooldown(); 
        } else if (res.status >= 500) {
            indicator.classList.add('status-5xx');
        } else {
            indicator.classList.add('status-4xx');
        }

        try {
            const json = JSON.parse(text);
            output.innerText = JSON.stringify(json, null, 4);
        } catch {
            output.innerText = text || "<No Content>";
        }

        if (config.idempotency && res.ok) {
            document.getElementById('input-idempotency').value = 'key-' + Math.random().toString(36).substr(2, 9);
        }

    } catch (err) {
        indicator.innerText = "ERRO DE REDE";
        indicator.classList.remove('status-2xx', 'status-4xx');
        indicator.classList.add('status-5xx');
        output.innerText = err.message;
    }
}