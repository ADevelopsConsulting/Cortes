const { useState, useEffect, useRef } = React;

const App = () => {
    const [file, setFile] = useState(null);
    const [sensitivity, setSensitivity] = useState(70);
    const [clipLength, setClipLength] = useState(30);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Iniciando processamento...');
    const [processedFileUrl, setProcessedFileUrl] = useState(null);
    const [segments, setSegments] = useState([]); // Store segments with URLs and metadata
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    // Load video metadata when a file is selected
    const handleFileSelect = (selectedFile) => {
        if (selectedFile.type.startsWith('video/')) {
            setFile(selectedFile);
            const videoUrl = URL.createObjectURL(selectedFile);
            const video = document.createElement('video');
            video.src = videoUrl;
            video.onloadedmetadata = () => {
                videoRef.current = { duration: video.duration }; // Store duration
                URL.revokeObjectURL(videoUrl); // Clean up
            };
        } else {
            alert('Por favor, selecione um arquivo de vídeo válido.');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    // Simulate identifying key moments based on duration and sensitivity
    const identifyKeyMoments = (duration, sensitivity) => {
        const momentCount = Math.floor((sensitivity / 100) * (duration / 60)) + 1; // More moments with higher sensitivity
        const interval = duration / (momentCount + 1);
        const moments = [];
        for (let i = 1; i <= momentCount; i++) {
            const timestamp = i * interval;
            if (timestamp < duration) {
                moments.push(timestamp);
            }
        }
        return moments;
    };

    // Extract a segment of the video using MediaRecorder
    const extractSegment = async (startTime, duration) => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.currentTime = startTime;
            video.muted = true; // Mute to avoid playback sound
            video.play();

            const stream = video.captureStream();
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            mediaRecorderRef.current = mediaRecorder;
            recordedChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                video.pause();
                resolve({ blob, startTime, duration });
            };

            mediaRecorder.start();

            setTimeout(() => {
                mediaRecorder.stop();
                video.pause();
            }, duration * 1000);
        });
    };

    const startProcessing = async () => {
        if (!file || !videoRef.current) {
            alert('Por favor, selecione um vídeo primeiro e aguarde o carregamento.');
            return;
        }

        setIsModalOpen(true);
        setProgress(0);
        setStatus('Analisando vídeo...');

        const videoDuration = videoRef.current.duration;
        const keyMoments = identifyKeyMoments(videoDuration, sensitivity);
        const segmentDuration = Math.min(clipLength, videoDuration); // Use user-defined clip length

        // Simulate processing progress
        const totalSteps = keyMoments.length + 2; // Analysis + each segment + final compilation
        let currentStep = 0;

        const updateProgress = () => {
            currentStep++;
            const newProgress = (currentStep / totalSteps) * 100;
            setProgress(newProgress);

            if (newProgress <= 30) {
                setStatus('Analisando momentos chave...');
            } else if (newProgress <= 60) {
                setStatus('Extraindo segmentos...');
            } else if (newProgress <= 90) {
                setStatus('Compilando clipe final...');
            } else {
                setStatus('Processamento concluído!');
            }
        };

        updateProgress(); // Step 1: Analysis

        // Extract segments around key moments
        const extractedSegments = [];
        for (let i = 0; i < keyMoments.length; i++) {
            const startTime = Math.max(0, keyMoments[i] - segmentDuration / 2);
            const adjustedDuration = Math.min(segmentDuration, videoDuration - startTime);
            const segmentData = await extractSegment(startTime, adjustedDuration);
            const segmentUrl = URL.createObjectURL(segmentData.blob);
            extractedSegments.push({
                url: segmentUrl,
                startTime: segmentData.startTime,
                duration: segmentData.duration,
            });
            updateProgress(); // Step for each segment
        }

        // Combine segments into a final clip (1–3 minutes)
        let totalDuration = extractedSegments.length * segmentDuration;
        let finalSegments = extractedSegments;
        if (totalDuration < 60) {
            // If total duration is less than 1 minute, repeat segments to reach at least 1 minute
            const repeatCount = Math.ceil(60 / totalDuration);
            finalSegments = [];
            for (let i = 0; i < repeatCount; i++) {
                finalSegments.push(...extractedSegments);
            }
            totalDuration = finalSegments.length * segmentDuration;
        }
        if (totalDuration > 180) {
            // If total duration exceeds 3 minutes, trim segments
            const maxSegments = Math.floor(180 / segmentDuration);
            finalSegments = finalSegments.slice(0, maxSegments);
            totalDuration = finalSegments.length * segmentDuration;
        }

        // Combine all segments into a single blob for download
        const finalBlobs = finalSegments.map((seg) => seg.blob);
        const finalBlob = new Blob(finalBlobs, { type: 'video/webm' });
        const finalUrl = URL.createObjectURL(finalBlob);
        setProcessedFileUrl(finalUrl);
        setSegments(finalSegments); // Store segments for preview

        updateProgress(); // Final step: Compilation
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setProgress(0);
        setStatus('Iniciando processamento...');
        if (processedFileUrl) {
            URL.revokeObjectURL(processedFileUrl);
            setProcessedFileUrl(null);
        }
        segments.forEach((seg) => URL.revokeObjectURL(seg.url)); // Clean up segment URLs
        setSegments([]);
        recordedChunksRef.current = [];
    };

    const handleDownload = () => {
        if (processedFileUrl) {
            const link = document.createElement('a');
            link.href = processedFileUrl;
            link.download = `processed_clip_${file.name.split('.')[0]}.webm`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            closeModal();
        } else {
            alert('Nenhum arquivo processado disponível para download.');
        }
    };

    // Format timestamp for display (e.g., 125 seconds -> 02:05)
    const formatTimestamp = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-6 shadow-lg">
                <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-3xl font-bold">
                        Corte<span className="text-pink-500">Fácil</span>
                    </h1>
                    <p className="mt-2 opacity-90">Cortes de vídeo inteligentes com IA</p>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h2 className="text-4xl font-semibold text-indigo-700 mb-6">
                        Crie cortes perfeitos em segundos com nossa IA
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                        Nossa inteligência artificial analisa seus vídeos para identificar os momentos mais importantes e criar cortes profissionais automaticamente.
                    </p>

                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
                        <div
                            className="upload-area rounded-lg p-6 text-center cursor-pointer"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('fileInput').click()}
                        >
                            {file ? (
                                <>
                                    <div className="text-4xl mb-4">✅</div>
                                    <p className="text-gray-600">{file.name}</p>
                                </>
                            ) : (
                                <>
                                    <div className="text-4xl mb-4 text-blue-500">📁</div>
                                    <p className="text-gray-600">Arraste seu vídeo aqui ou clique para selecionar</p>
                                </>
                            )}
                            <input
                                type="file"
                                id="fileInput"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                            />
                        </div>

                        <div className="mt-6">
                            <div className="mb-4">
                                <label htmlFor="sensitivity" className="block font-medium mb-2">
                                    Sensibilidade da detecção
                                </label>
                                <input
                                    type="range"
                                    id="sensitivity"
                                    min="0"
                                    max="100"
                                    value={sensitivity}
                                    onChange={(e) => {
                                        setSensitivity(e.target.value);
                                        document.getElementById('sensitivityValue').textContent = `${e.target.value}%`;
                                    }}
                                    className="w-full"
                                />
                                <span id="sensitivityValue" className="block text-right text-sm text-gray-600 mt-1">
                                    {sensitivity}%
                                </span>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="clipLength" className="block font-medium mb-2">
                                    Duração do segmento base (segundos)
                                </label>
                                <input
                                    type="range"
                                    id="clipLength"
                                    min="5"
                                    max="60"
                                    value={clipLength}
                                    onChange={(e) => {
                                        setClipLength(e.target.value);
                                        document.getElementById('clipLengthValue').textContent = `${e.target.value} segundos`;
                                    }}
                                    className="w-full"
                                />
                                <span id="clipLengthValue" className="block text-right text-sm text-gray-600 mt-1">
                                    {clipLength} segundos
                                </span>
                            </div>
                        </div>

                        <button
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-indigo-600 transition-all"
                            onClick={startProcessing}
                        >
                            Processar vídeo
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-semibold text-center text-gray-900 mb-12">
                        Por que usar o CorteFácil?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: '🔍', title: 'Detecção inteligente', desc: 'Nossa IA identifica automaticamente momentos importantes baseados em áudio e mudanças visuais.' },
                            { icon: '⚡', title: 'Processamento rápido', desc: 'Economize horas de edição manual com nossa tecnologia de processamento acelerado.' },
                            { icon: '🎮', title: 'Perfeito para gamers', desc: 'Extraia automaticamente os melhores momentos das suas gameplays para compartilhar.' },
                            { icon: '📱', title: 'Compatível com celular', desc: 'Use nosso serviço diretamente do seu smartphone, sem precisar instalar nada.' },
                            { icon: '🔒', title: 'Privacidade garantida', desc: 'Seus vídeos são processados com segurança e excluídos automaticamente após 24 horas.' },
                            { icon: '🎛️', title: 'Totalmente personalizável', desc: 'Ajuste as configurações para obter exatamente o tipo de cortes que você precisa.' },
                        ].map((feature, index) => (
                            <div key={index} className="feature-item bg-white rounded-lg p-6 shadow-lg text-center">
                                <div className="text-4xl mb-4 text-blue-500">{feature.icon}</div>
                                <h3 className="text-xl font-semibold text-indigo-700 mb-4">{feature.title}</h3>
                                <p className="text-gray-600">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-semibold text-center text-gray-900 mb-12">Como funciona</h2>
                    <div className="flex flex-wrap justify-around counter-reset">
                        {[
                            { title: 'Faça upload do vídeo', desc: 'Selecione qualquer vídeo do seu dispositivo para começar o processo.' },
                            { title: 'Configure as opções', desc: 'Ajuste a sensibilidade da detecção e outras configurações conforme necessário.' },
                            { title: 'Deixe a IA trabalhar', desc: 'Nossa inteligência artificial analisará seu vídeo para encontrar os melhores momentos.' },
                            { title: 'Baixe os cortes', desc: 'Receba uma compilação dos melhores momentos, pronta para compartilhar.' },
                        ].map((step, index) => (
                            <div key={index} className="step flex-1 min-w-[200px] max-w-xs text-center p-4">
                                <h3 className="text-xl font-semibold text-indigo-700 mb-4">{step.title}</h3>
                                <p className="text-gray-600">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h3 className="text-2xl font-bold mb-4">
                        Corte<span className="text-pink-500">Fácil</span>
                    </h3>
                    <div className="flex justify-center space-x-4 mb-4">
                        <a href="#" className="text-2xl">📘</a>
                        <a href="#" className="text-2xl">📸</a>
                        <a href="#" className="text-2xl">🐦</a>
                        <a href="#" className="text-2xl">📱</a>
                    </div>
                    <p className="text-sm opacity-70">© 2025 CorteFácil. Todos os direitos reservados.</p>
                </div>
            </footer>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-3xl w-full text-center relative overflow-y-auto max-h-[80vh]">
                        <span
                            className="absolute top-4 right-4 text-2xl cursor-pointer text-gray-600"
                            onClick={closeModal}
                        >
                            ×
                        </span>
                        <h2 className="text-2xl font-semibold mb-4">Processando seu vídeo</h2>
                        <p className="text-gray-600 mb-6">
                            Nossa IA está analisando seu vídeo para encontrar os melhores momentos.
                        </p>
                        <div className="progress-bar">
                            <div className="progress" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{Math.round(progress)}%</p>
                        <p className="text-gray-600 mt-4">{status}</p>

                        {progress >= 100 && segments.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">Cortes Realizados</h3>
                                <div className="space-y-4">
                                    {segments.map((segment, index) => (
                                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                            <p className="text-gray-700 mb-2">
                                                <strong>Segmento {index + 1}</strong>: Início em {formatTimestamp(segment.startTime)}, Duração: {formatTimestamp(segment.duration)}
                                            </p>
                                            <video
                                                src={segment.url}
                                                controls
                                                className="w-full rounded-lg"
                                                style={{ maxHeight: '200px' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="mt-6 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-all"
                                    onClick={handleDownload}
                                >
                                    Baixar clipe final
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
