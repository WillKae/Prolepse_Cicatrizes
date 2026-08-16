document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map
    // Centered around Mato Grosso do Sul (MS), Brazil
    const map = L.map('map').setView([-20.4428, -54.6464], 7);

    // 2. Define Basemaps
    const basemaps = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }),
        carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        })
    };

    // Set default basemap
    basemaps.satellite.addTo(map);

    // Render Basemap Selector UI
    const basemapSelector = document.getElementById('basemap-selector');
    const basemapConfig = [
        { id: 'osm', name: 'OpenStreetMap', icon: '<i class="fa-solid fa-map" style="font-size: 20px; color: var(--primary-color); margin-right: 12px; width: 24px; text-align: center;"></i>' },
        { id: 'satellite', name: 'Esri Satellite', icon: '<i class="fa-solid fa-satellite" style="font-size: 20px; color: var(--primary-color); margin-right: 12px; width: 24px; text-align: center;"></i>' },
        { id: 'carto', name: 'Carto Light', icon: '<i class="fa-solid fa-map-location-dot" style="font-size: 20px; color: var(--primary-color); margin-right: 12px; width: 24px; text-align: center;"></i>' }
    ];

    basemapConfig.forEach((bm, index) => {
        const div = document.createElement('div');
        div.className = `basemap-option ${index === 1 ? 'active' : ''}`;
        div.innerHTML = `
            ${bm.icon}
            <span>${bm.name}</span>
        `;
        div.addEventListener('click', () => {
            // Remove all basemaps
            Object.values(basemaps).forEach(layer => map.removeLayer(layer));
            // Add selected
            basemaps[bm.id].addTo(map);
            // Update UI
            document.querySelectorAll('.basemap-option').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
        });
        basemapSelector.appendChild(div);
    });

    // 3. Define GeoJSON Layers
    const layersConfig = [
        { id: 'ms', name: 'Limite MS', file: 'MS.geojson', fillColor: '#ffff00', strokeColor: '#ffff00', weight: 2, fillOpacity: 0, type: 'polygon' },
        { id: 'municipios', name: 'Municípios', file: 'Municipios.geojson', fillColor: '#bdc3c7', strokeColor: 'white', weight: 0.5, fillOpacity: 0, type: 'polygon' },
        { id: 'visitas', name: 'Visitas Prolepse', file: 'Visitas_Prolepse.geojson', fillColor: '#ffff00', strokeColor: '#ffff00', fillOpacity: 0.20, type: 'polygon' },
        { id: 'prolepse_1bpma', name: 'Prolepse 1º BPMA', file: 'Prolepse_1_BPMA.geojson', fillColor: '#ffff00', strokeColor: '#ffff00', fillOpacity: 0.20, type: 'polygon' },
        { id: 'prolepse_2bpma', name: 'Prolepse 2º BPMA', file: 'Prolepse_2_BPMA.geojson', fillColor: '#ffff00', strokeColor: '#ffff00', fillOpacity: 0.20, type: 'polygon' },
        { id: 'ci_ms', name: 'Cicatrizes Queimada MS', file: 'Cicatrizes_Queimada_MS.geojson', fillColor: '#d35400', strokeColor: '#d35400', type: 'polygon' },
        { id: 'ci_1bpma', name: 'Cicatrizes Q. 1º BPMA', file: 'Cicatrizes_Queimadas_1_BPMA.geojson', fillColor: '#d35400', strokeColor: '#d35400', type: 'polygon' },
        { id: 'ci_2bpma', name: 'Cicatrizes Q. 2º BPMA', file: 'Cicatrizes_Queimadas_2_BPMA.geojson', fillColor: '#d35400', strokeColor: '#d35400', type: 'polygon' },
        { id: '1_bpma', name: '1º BPMA', file: '1_BPMA.geojson', fillColor: '#B2DF8A', strokeColor: 'rgba(255,255,255,0.85)', weight: 0.5, type: 'polygon' },
        { id: '2_bpma', name: '2º BPMA', file: '2_BPMA.geojson', fillColor: '#ECDDCA', strokeColor: 'rgba(255,255,255,0.85)', weight: 0.5, type: 'polygon' }
    ];

    const loadedLayers = {}; // Cache for loaded GeoJSON data

    const layerList = document.getElementById('layer-list');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    layersConfig.forEach(layer => {
        const div = document.createElement('div');
        div.className = 'layer-item';
        div.innerHTML = `
            <div class="layer-info">
                <div class="color-box" style="background-color: ${layer.fillColor || layer.strokeColor}; ${layer.fillOpacity === 0 ? 'background-color: transparent;' : ''} border-color: ${layer.strokeColor}; ${layer.type === 'line' ? `height: 4px; border-radius: 0;` : ''}"></div>
                <span>${layer.name} <br><small style="color: #e74c3c; font-size: 0.75rem;">${layer.warning || ''}</small></span>
            </div>
            <label class="switch">
                <input type="checkbox" id="toggle-${layer.id}">
                <span class="slider"></span>
            </label>
        `;
        
        layerList.appendChild(div);

        const checkbox = document.getElementById(`toggle-${layer.id}`);
        
        checkbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                // Warning for large files
                if(layer.warning) {
                    const confirmLoad = await Swal.fire({
                        title: 'Atenção!',
                        text: `O arquivo ${layer.name} é ${layer.warning}. Pode demorar para carregar ou travar o navegador. Deseja continuar?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sim, carregar',
                        cancelButtonText: 'Cancelar'
                    });

                    if(!confirmLoad.isConfirmed) {
                        e.target.checked = false;
                        return;
                    }
                }

                // Show Loading
                loadingText.innerText = `Carregando ${layer.name}...`;
                loadingOverlay.classList.remove('hidden');

                setTimeout(async () => {
                    try {
                        if (!loadedLayers[layer.id]) {
                            // Fetch data for standard GeoJSON
                            const response = await fetch(layer.file);
                            if (!response.ok) throw new Error("Erro de rede ao carregar arquivo.");
                            const data = await response.json();
                            
                            // Style function based on type
                            const styleFunc = (feature) => {
                                const weight = layer.weight !== undefined ? layer.weight : 1;
                                if (layer.type === 'line') {
                                    return { color: layer.strokeColor, weight: weight, opacity: 0.8 };
                                }
                                return {
                                    fillColor: layer.fillColor,
                                    color: layer.strokeColor,
                                    weight: weight,
                                    opacity: 1,
                                    fillOpacity: layer.fillOpacity !== undefined ? layer.fillOpacity : 0.4
                                };
                            };

                            const geoJsonLayer = L.geoJSON(data, {
                                style: styleFunc,
                                pointToLayer: (feature, latlng) => {
                                    return L.circleMarker(latlng, {
                                        radius: 6,
                                        fillColor: layer.fillColor,
                                        color: layer.strokeColor,
                                        weight: layer.weight !== undefined ? layer.weight : 1,
                                        opacity: 1,
                                        fillOpacity: layer.fillOpacity !== undefined ? layer.fillOpacity : 0.8
                                    });
                                },
                                onEachFeature: (feature, layerObj) => {
                                    // Bind a simple popup with properties
                                    if (feature.properties) {
                                        let popupContent = '<div style="max-height: 200px; overflow-y: auto;"><b>Atributos:</b><br>';
                                        for (const key in feature.properties) {
                                            popupContent += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                                        }
                                        popupContent += '</div>';
                                        layerObj.bindPopup(popupContent);
                                    }
                                }
                            });
                            
                            loadedLayers[layer.id] = geoJsonLayer;
                        }
                        
                        // Add to map
                        loadedLayers[layer.id].addTo(map);

                        // Fit bounds for first layer
                        if(Object.keys(loadedLayers).length === 1 && layer.id !== 'ms') {
                             map.fitBounds(loadedLayers[layer.id].getBounds());
                        }

                    } catch (error) {
                        console.error("Erro carregando camada:", error);
                        Swal.fire('Erro', `Não foi possível carregar ${layer.name}. Detalhe: ${error.message}`, 'error');
                        e.target.checked = false;
                    } finally {
                        loadingOverlay.classList.add('hidden');
                    }
                }, 100); // slight delay to allow UI to render spinner
            } else {
                // Remove from map
                if (loadedLayers[layer.id]) {
                    map.removeLayer(loadedLayers[layer.id]);
                }
            }
        });
    });
});
