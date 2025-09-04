"use client";       

import React, { useState, useEffect, useRef } from 'react';

// Use CDNs to include both the pdf-lib and pdf.js libraries.
// pdf-lib is for manipulating the PDF structure (adding/removing pages).
// pdf.js is for rendering the PDF pages for a visual preview.
const PDFLibScript = () => (
    <>
        <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js"></script>
    </>
);

const App = () => {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pageImages, setPageImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const fileInputRef = useRef(null);
    const mergeInputRef = useRef(null);
    const [message, setMessage] = useState({ text: '', isError: false, isVisible: false });
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Function to show a temporary message to the user
    const showMessage = (text, isError = false) => {
        setMessage({ text, isError, isVisible: true });
        setTimeout(() => {
            setMessage(prev => ({ ...prev, isVisible: false }));
        }, 3000);
    };

    // Function to render PDF pages from an ArrayBuffer
    const renderPdfPages = async (arrayBuffer) => {
        const { pdfjsLib } = window;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        const images = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.8 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = { canvasContext: context, viewport: viewport };
            await page.render(renderContext).promise;
            images.push(canvas.toDataURL('image/png'));
        }
        return images;
    };

    // Handler for file upload
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            showMessage('Please select a valid PDF file.', true);
            return;
        }

        setLoading(true);
        setPageImages([]);
        setPdfDoc(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Step 1: Use pdf-lib to load the document for manipulation (e.g., removing pages)
            const { PDFDocument } = window.PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            setPdfDoc(pdfDoc);

            // Step 2: Use pdf.js to render the document pages for visual preview
            const images = await renderPdfPages(arrayBuffer);

            setPageImages(images);
            showMessage('PDF loaded successfully!');

        } catch (error) {
            console.error('Error loading PDF:', error);
            showMessage('Failed to load PDF. Please try again.', true);
        } finally {
            setLoading(false);
            // Reset the file input value so the same file can be re-uploaded
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handler for merging a PDF
    const handleMergePdf = async (event) => {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            showMessage('Please select a valid PDF file to merge.', true);
            return;
        }

        if (!pdfDoc) {
            showMessage('Please upload a main PDF first.', true);
            return;
        }

        setLoading(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = window.PDFLib;
            const mergedPdfDoc = await PDFDocument.load(arrayBuffer);
            
            const copiedPages = await pdfDoc.copyPages(mergedPdfDoc, mergedPdfDoc.getPageIndices());
            copiedPages.forEach(page => pdfDoc.addPage(page));

            const updatedPdfBytes = await pdfDoc.save();
            const images = await renderPdfPages(updatedPdfBytes);
            setPageImages(images);
            
            showMessage('PDFs merged successfully!');
        } catch (error) {
            console.error('Error merging PDF:', error);
            showMessage('Failed to merge PDF. Please try again.', true);
        } finally {
            setLoading(false);
            if (mergeInputRef.current) {
                mergeInputRef.current.value = '';
            }
        }
    };

    // Handler for removing a page
    const handleRemovePage = (indexToRemove) => {
        // ... (existing code)
        try {
            // ... (existing code)
            
            const newPages = pageImages.filter((_, index) => index !== indexToRemove);
            setPageImages(newPages);

            // Check if all pages have been removed
            if (newPages.length === 0) {
                setPdfDoc(null);
            }
            
            showMessage(`Page ${indexToRemove + 1} removed.`);
        } catch (error) {
            // ... (existing code)
        }
    };

    // Handler for clearing the loaded PDF
    const handleClearAll = () => {
        setShowConfirmModal(true);
    };

    const confirmClearAll = () => {
        setPdfDoc(null);
        setPageImages([]);
        showMessage("PDF cleared.");
        setShowConfirmModal(false);
    };

    const cancelClearAll = () => {
        setShowConfirmModal(false);
    };

    // Reordering logic
    const reorderPages = (sourceIndex, targetIndex) => {
        if (sourceIndex === null || sourceIndex === targetIndex) {
            setDraggedIndex(null);
            setHoveredIndex(null);
            return;
        }
    
        // Reorder the PDF pages in the pdf-lib document
        const pageToMove = pdfDoc.getPages()[sourceIndex];
        pdfDoc.removePage(sourceIndex);
        pdfDoc.insertPage(targetIndex, pageToMove);
        
        // Update the page images array for the UI
        const newPageImages = [...pageImages];
        const [movedPage] = newPageImages.splice(sourceIndex, 1);
        newPageImages.splice(targetIndex, 0, movedPage);
        setPageImages(newPageImages);

        showMessage('Page reordered!');
        setDraggedIndex(null);
        setHoveredIndex(null);
    };

    // Draggable page handlers (Mouse)
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        const target = e.target.closest('.page-card');
        if (target) {
            const index = parseInt(target.dataset.index);
            setHoveredIndex(index);
        }
    };

    const handleDragLeave = () => {
        setHoveredIndex(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        reorderPages(draggedIndex, dropIndex);
    };

    // Draggable page handlers (Touch)
    const handleTouchStart = (e, index) => {
        setDraggedIndex(index);
    };

    const handleTouchMove = (e) => {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        // Add a null check for the target element and the card.
        if (target) {
            const card = target.closest('.page-card');
            if (card) {
                const index = parseInt(card.dataset.index);
                setHoveredIndex(index);
            }
        }
    };

    const handleTouchEnd = (e) => {
        if (draggedIndex !== null && hoveredIndex !== null) {
            reorderPages(draggedIndex, hoveredIndex);
        }
    };

    // Handler for downloading the modified PDF
    const handleDownload = async () => {
        if (!pdfDoc) {
            showMessage('No PDF to download.', true);
            return;
        }
        setLoading(true);
        try {
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'edited.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage('PDF downloaded successfully!');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showMessage('Failed to download PDF.', true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center p-8 font-sans">
            <PDFLibScript />
            <style jsx>{`
                .page-card {
                    touch-action: none;
                }
            `}</style>
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 space-y-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900">
                    PDF Manager
                </h1>
                <p className="text-center text-lg text-gray-600">
                    Upload, manage, and download your PDF file.
                </p>

                {/* Message Box */}
                {message.isVisible && (
                    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-opacity duration-500 ease-in-out ${message.isError ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                        {message.text}
                    </div>
                )}

                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                            <h3 className="text-xl font-semibold mb-4 text-gray-900">Are you sure?</h3>
                            <p className="text-gray-600 mb-6">ไฟล์ PDF จะถูกลบทั้งหมด</p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={confirmClearAll}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition-colors"
                                >
                                    ลบทั้งหมด
                                </button>
                                <button
                                    onClick={cancelClearAll}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full transition-colors"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
                    >
                        {pdfDoc ? 'อัปโหลด New PDF' : 'อัปโหลด PDF'}
                        <input
                            id="file-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                        />
                    </label>
                    <label
                        htmlFor="merge-upload"
                        className={`cursor-pointer font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 ${
                            !pdfDoc || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                    >
                        เพิ่มหน้า PDF
                        <input
                            id="merge-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleMergePdf}
                            ref={mergeInputRef}
                            className="hidden"
                            disabled={!pdfDoc || loading}
                        />
                    </label>
                    <button
                        onClick={handleDownload}
                        disabled={!pdfDoc || loading}
                        className={`font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 ${
                            !pdfDoc || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        {loading ? 'Processing...' : 'ดาวโหลด PDF'}
                    </button>
                    {pdfDoc && (
                        <button
                            onClick={handleClearAll}
                            className="font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 bg-red-600 hover:bg-red-700 text-white"
                        >
                            ลบทั้งหมด
                        </button>
                    )}
                </div>

                {/* Loading indicator */}
                {loading && (
                    <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500"></div>
                    </div>
                )}
                
                {/* PDF Page Display */}
                {pdfDoc && !loading && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800">Manage Pages</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {pageImages.map((imageSrc, index) => (
                                <div
                                    key={index}
                                    data-index={index}
                                    className={`page-card relative bg-white border border-gray-300 rounded-xl shadow-md p-2 cursor-grab transition-transform transform hover:scale-105 ${draggedIndex === index ? 'opacity-50' : ''} ${hoveredIndex === index ? 'border-4 border-dashed border-indigo-500' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onTouchStart={(e) => handleTouchStart(e, index)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <img 
                                        src={imageSrc} 
                                        alt={`Page ${index + 1}`} 
                                        className="w-full h-auto rounded-lg border border-gray-400"
                                    />
                                    <div className="flex justify-between items-center mt-2 px-1">
                                        <span className="text-sm font-medium text-gray-600">Page {index + 1}</span>
                                        <button
                                            onClick={() => handleRemovePage(index)}
                                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-full transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!pdfDoc && !loading && (
                    <div className="text-center py-20 text-gray-500">
                        <p>No PDF uploaded yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
