const { useState, useEffect } = React;

const App = () => {
    const [file, setFile] = useState(null);
    const [sensitivity, setSensitivity] = useState(70);
    const [clipLength, setClipLength] = useState(30);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Iniciando processamento...');
    const [processedFileUrl, setProcessedFileUrl] = useState(null);

    const handleFileSelect = (selectedFile) => {
        if (selectedFile.type.startsWith('video/')) {
            setFile(selectedFile);
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

    const startProcessing = () => {
        if (!file) {
            alert('Por favor, selecione um vídeo primeiro.');
            return;
        }
        setIsModalOpen(true);
        setProgress(0);
        setStatus('Iniciando processamento...');

        const interval = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev + Math.random() * 5;
                if (newProgress <= 30) {
                    setStatus('Analisando áudio...');
                } else if (newProgress <= 60) {
                    setStatus('Detectando mudanças de cena...');
                } else if (newProgress <= 90) {
                    setStatus('Criando cortes...');
                } else {
                    setStatus('Finalizando processamento...');
                }

                if (newProgress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setStatus('Processamento concluído!');
                        // Since this is a prototype, we use the original file as the "processed" file.
                        // In a real application, this would be the URL or blob of the actual processed video.
                        const processedUrl = URL.createObjectURL(file);
                        setProcessedFileUrl(processedUrl);
                    }, 1000);
                    return 100;
                }
                return newProgress;
            });
        }, 300);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setProgress(0);
        setStatus('Iniciando processamento...');
        // Clean up the URL object to avoid memory leaks
        if (processedFileUrl) {
            URL.revokeObjectURL(processedFileUrl);
            setProcessedFileUrl(null);
        }
    };

    const handleDownload = () => {
        if (processedFileUrl) {
            const link = document.createElement('a');
            link.href = processedFileUrl;
            link.download = `processed_${file.name}`; // Name the downloaded file
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            closeModal();
        } else {
            alert('Nenhum arquivo processado disponível para download.');
        }
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
                                    Duração máxima do clipe
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
                    <div className="bg-white rounded-lg p-8 max-w-md w-full text-center relative">
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
                        {progress >= 100 && (
                            <button
                                className="mt-6 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-all"
                                onClick={handleDownload}
                            >
                                Baixar cortes
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
