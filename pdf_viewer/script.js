const pdfUpload = document.getElementById('pdf-upload');
const pdfContainer = document.getElementById('pdf-container');
const scrollUp = document.querySelector('.scroll-up');
const scrollDown = document.querySelector('.scroll-down');
const scrollUpLeft = document.querySelector('.scroll-up-left');
const scrollDownLeft = document.querySelector('.scroll-down-left');
const pageNumberInput = document.getElementById('page-number');
const jumpToPageButton = document.getElementById('jump-to-page');
let pdfDocument = null;
let currentFilename = '';
const viewedPages = {}; // Store canvas positions for scroll detection
const currentPageDiv = document.querySelector('.current-page-div'); // div to display current page number

var initial_page_count_scroll = false

pdfUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        currentFilename = file.name;
        const fileReader = new FileReader();

        fileReader.onload = function () {
            const typedArray = new Uint8Array(this.result);
            renderPDF(typedArray, currentFilename);
        };

        fileReader.readAsArrayBuffer(file);
    } else {
        alert('Please upload a valid PDF file.');
    }
});

async function renderPDF(pdfData, filename) {
    fetchAndDisplaySavedPage();

    // Clear previous content
    pdfContainer.innerHTML = '';

    // Load PDF.js and get the document
    pdfDocument = await pdfjsLib.getDocument(pdfData).promise;

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);

        // Create canvas element
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page into canvas
        const renderTask = page.render({
            canvasContext: context,
            viewport: viewport,
        });

        await renderTask.promise;

        // Add watermark
        addWatermark(canvas, `${pageNumber} / ${pdfDocument.numPages}`);

        pdfContainer.appendChild(canvas);

        // Store canvas position for scroll detection
        viewedPages[pageNumber] = canvas.offsetTop;
    }


    // Start sending current page to the server every minute
    setInterval(async () => {
        await sendCurrentPageToServer();
    }, 60000); // 60000ms = 1 minute

    // Start fetching and displaying saved page number every 60 seconds
    setInterval(async () => {
        await fetchAndDisplaySavedPage();
    }, 60000); // Fetch and update every minute


}

function addWatermark(canvas, text) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.font = '100px Arial';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add watermark text diagonally
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

// Send current page to server every minute
async function sendCurrentPageToServer() {
    console.log("Post method called..");

    const currentPage = getCurrentPageNumber();
    if (currentPage !== null && currentFilename) {
        const data = {
            file_name: currentFilename,
            page_number: currentPage,
        };

        try {
            const response = await fetch('https://project-books-data.vercel.app/save-page-num', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            currentPageDiv.textContent = `Saved Page Number: ${currentPage}`;

        } catch (error) {
            console.error('Error sending page number:', error);
        }
    }
}

function getCurrentPageNumber() {
    const scrollTop = pdfContainer.scrollTop;
    let currentPage = null;

    for (const [page, offset] of Object.entries(viewedPages)) {
        if (scrollTop >= offset - 10) {
            currentPage = parseInt(page, 10);
        }
    }

    return currentPage;
}

// Fetch and display the saved page number from the server
async function fetchAndDisplaySavedPage() {
    console.log("Get method called..");
    setTimeout(() => {

    }, 3000);

    try {
        const response = await fetch('https://project-books-data.vercel.app/get-page-num');
        const booksData = await response.json();

        // Find the book data by filename and display the page number
        const bookData = booksData.find(book => book.book_name === currentFilename);
        if (bookData) {
            let savedPageNumber = bookData.current_page;
            currentPageDiv.textContent = `Saved Page Number: ${savedPageNumber}`;

            if (initial_page_count_scroll === false) {
                // Scroll to saved page if available
                if (savedPageNumber) {
                    savedPageNumber = Number(savedPageNumber) - 1
                    setTimeout(() => {

                    }, 1000);
                    const targetCanvas = pdfContainer.querySelectorAll('canvas')[savedPageNumber];
                    if (targetCanvas) {
                        targetCanvas.scrollIntoView({ behavior: 'smooth' });
                        initial_page_count_scroll = true

                    }

                }
            }
        }
        else {
            currentPageDiv.textContent = `Saved Page Number: This is newly added book`;

        }
    } catch (error) {
        console.error('Error fetching book data:', error);
    }
}

// Scroll navigation logic
const scrollStep = () => {
    return 250; // Step size for scrolling
};

document.addEventListener("keydown", function(event) {
    let key_btn = event.key
    if(key_btn ==='PageUp'){
            pdfContainer.scrollBy({
                top: -scrollStep(),
                behavior: 'smooth',
            });
        
    }
    if(key_btn ==='PageDown'){
        pdfContainer.scrollBy({
            top: scrollStep(),
            behavior: 'smooth',
        });
    
}

});



scrollUp.addEventListener('click', () => {
    pdfContainer.scrollBy({
        top: -scrollStep(),
        behavior: 'smooth',
    });
});

scrollDown.addEventListener('click', () => {
    pdfContainer.scrollBy({
        top: scrollStep(),
        behavior: 'smooth',
    });
});

scrollUpLeft.addEventListener('click', () => {
    pdfContainer.scrollBy({
        top: -scrollStep(),
        behavior: 'smooth',
    });
});

scrollDownLeft.addEventListener('click', () => {
    pdfContainer.scrollBy({
        top: scrollStep(),
        behavior: 'smooth',
    });
});

// Jump to specific page
jumpToPageButton.addEventListener('click', () => {
    const pageNumber = parseInt(pageNumberInput.value, 10);
    if (pageNumber > 0 && pageNumber <= pdfDocument.numPages) {
        const canvasElements = pdfContainer.querySelectorAll('canvas');
        const targetCanvas = canvasElements[pageNumber - 1];
        if (targetCanvas) {
            targetCanvas.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        alert(`Please enter a valid page number between 1 and ${pdfDocument.numPages}.`);
    }
});
