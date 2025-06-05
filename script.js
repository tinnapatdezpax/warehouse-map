// script.js

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyGz5ruLtT5CJehNCEbimRv9kpfCOomnNDKNOl-YuY0AhG3QB0CLCNlnXEQQj3pUuy0mA/exec'; // !!! IMPORTANT: Replace with your deployed Google Apps Script Web App URL !!!

// Global variable to store currently active location ID
let currentActiveLocationId = '';

// Array to store QR codes and their new locations for the relocate modal
let relocateItems = []; // Array to hold {qrCode: '', oldLocation: '', newLocation: ''} objects

// Array to store QR codes and their found locations for the QR search modal
let searchItems = []; // Array to hold {qrCode: '', foundLocation: ''} objects

// NEW: Array to store product search results
let productSearchResults = []; // Array to hold {qrCode: '', productName: '', location: ''} objects

document.addEventListener('DOMContentLoaded', async () => { // Made async to await applyLocationColors
    const warehouseMap = document.getElementById('warehouse-map');
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 10 }, (_, i) => i + 1);

    // Dynamically create location slots
    rows.forEach(rowChar => {
        cols.forEach(colNum => {
            const locationId = `${rowChar}-${colNum}`;
            const slot = document.createElement('div');
            slot.id = locationId;
            slot.classList.add('location-slot');
            slot.innerText = locationId;
            slot.addEventListener('click', () => openSidebar(locationId));
            warehouseMap.appendChild(slot);
        });
    });

    // Initial apply of colors to location slots
    await applyLocationColors(); // Call it when the page loads

    // Add Enter key functionality to QR code input in main sidebar
    const qrCodeInput = document.getElementById('qrCodeInput');
    if (qrCodeInput) {
        qrCodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                handleAddItem();
            }
        });
    }

    // Add Enter key functionality to QR code input in relocate modal
    const relocateQrCodeInput = document.getElementById('relocateQrCodeInput');
    const addRelocateItemBtn = document.getElementById('addRelocateItemBtn');
    if (relocateQrCodeInput) {
        relocateQrCodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                addRelocateItemToList();
            }
        });
    }
    if (addRelocateItemBtn) {
        addRelocateItemBtn.addEventListener('click', addRelocateItemToList);
    }

    // Add Enter key functionality to QR code input in QR search modal
    const searchQrCodeInput = document.getElementById('searchQrCodeInput');
    const addSearchItemBtn = document.getElementById('addSearchItemBtn');
    if (searchQrCodeInput) {
        searchQrCodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                addSearchItemToList();
            }
        });
    }
    if (addSearchItemBtn) {
        addSearchItemBtn.addEventListener('click', addSearchItemToList);
    }

    // NEW: Add Enter key functionality to Product Name input in Product Search modal
    const productNameInput = document.getElementById('productNameInput');
    const searchByProductNameBtn = document.getElementById('searchByProductNameBtn');
    if (productNameInput) {
        productNameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                performProductSearch(); // Call new function for product name search
            }
        });
    }
    if (searchByProductNameBtn) {
        searchByProductNameBtn.addEventListener('click', performProductSearch);
    }


    // IMPORTANT: Call close modals to hide them on load
    closeRelocateModal();
    closeSearchModal();
    closeProductSearchModal(); // NEW: Close product search modal on load
});

// Add event listener for closing modal when clicking outside of content
window.addEventListener('click', function(event) {
    const relocateModal = document.getElementById('relocate-modal');
    const searchModal = document.getElementById('search-modal');
    const productSearchModal = document.getElementById('product-search-modal'); // NEW

    if (event.target === relocateModal && relocateModal.classList.contains('open')) {
        closeRelocateModal();
    }
    if (event.target === searchModal && searchModal.classList.contains('open')) {
        closeSearchModal();
    }
    if (event.target === productSearchModal && productSearchModal.classList.contains('open')) { // NEW
        closeProductSearchModal();
    }
});


// NEW: Function to apply colors to location slots based on stock count
async function applyLocationColors() {
    try {
        const response = await fetch(`${WEB_APP_URL}?action=getAllLocationCounts`);
        const locationCounts = await response.json();

        if (locationCounts.error) {
            console.error("Error fetching location counts:", locationCounts.error);
            return;
        }

        const warehouseMap = document.getElementById('warehouse-map');
        const locationSlots = warehouseMap.querySelectorAll('.location-slot');

        locationSlots.forEach(slot => {
            const locationId = slot.id;
            const count = locationCounts[locationId] || 0; // Default to 0 if location not in data

            // Reset classes first
            slot.classList.remove('empty', 'low-stock', 'high-stock');

            // Apply new class based on count
            if (count === 0) {
                slot.classList.add('empty');
            } else if (count >= 1 && count <= 5) {
                slot.classList.add('low-stock');
            } else if (count >= 6) { // Assuming 6+ items for high stock based on context of 1-5
                slot.classList.add('high-stock');
            }
        });
    } catch (error) {
        console.error("Error applying location colors:", error);
    }
}


async function openSidebar(locationId) {
    const sidebar = document.getElementById('item-details-sidebar');
    const currentLocationIdSpan = document.getElementById('current-location-id');
    const detailsContent = document.getElementById('details-content');
    const actionMessage = document.getElementById('action-message'); 

    currentActiveLocationId = locationId; // Set active location ID
    currentLocationIdSpan.innerText = locationId;
    detailsContent.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';
    actionMessage.innerText = ''; // Clear previous messages
    document.getElementById('qrCodeInput').value = ''; // Clear QR input
    sidebar.classList.add('open');
    document.body.classList.add('sidebar-open'); // Add class to body for potential margin adjustment

    try {
        const response = await fetch(`${WEB_APP_URL}?locationId=${locationId}`);
        const data = await response.json(); // Data now contains {items: []}

        if (data.error) {
            detailsContent.innerHTML = `<p style="color: red;">ข้อผิดพลาด: ${data.error}</p>`;
            return;
        }

        const items = data.items; // These are already grouped by product name

        if (items.length > 0) {
            let html = '<ul>';
            items.forEach(item => {
                // Pass currentActiveLocationId to openProductQRCodesSidebar
                html += `<li onclick="openProductQRCodesSidebar('${item.productName}', '${currentActiveLocationId}')">
                                <strong>${item.productName}</strong><br>
                                จำนวน: ${item.count} ชิ้น
                            </li>`;
            });
            html += '</ul>';
            detailsContent.innerHTML = html;

        } else {
            detailsContent.innerHTML = '<p>ไม่มีสินค้าในตำแหน่งนี้</p>';
        }

    } catch (error) {
        console.error('Error fetching data for main sidebar:', error);
        detailsContent.innerHTML = '<p style="color: red;">เกิดข้อผิดพลาดในการดึงข้อมูล. กรุณาลองใหม่อีกครั้ง.</p>';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('item-details-sidebar');
    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    closeProductQRCodesSidebar(); // Also close secondary sidebar if main is closed
}

// --- Functions for Secondary Sidebar (Product QRCodes) ---
// Now accepts locationId to filter QRCodes
async function openProductQRCodesSidebar(productName, locationId) {
    const productQRCodesSidebar = document.getElementById('product-qrcodes-sidebar');
    const currentProductNameSpan = document.getElementById('current-product-name');
    const productQRCodesContent = document.getElementById('product-qrcodes-content');

    currentProductNameSpan.innerText = productName;
    productQRCodesContent.innerHTML = '<p>กำลังโหลด QR Codes...</p>'; // Loading message
    productQRCodesSidebar.classList.add('open');
    document.body.classList.add('secondary-sidebar-open'); // Adjust body margin for secondary sidebar

    try {
        // Fetch QR codes for this product name AND this specific location
        const response = await fetch(`${WEB_APP_URL}?action=getQRCodesByProduct&productName=${encodeURIComponent(productName)}&locationIdFilter=${encodeURIComponent(locationId)}`);
        const qrcodes = await response.json();

        if (qrcodes.error) {
            productQRCodesContent.innerHTML = `<p style="color: red;">ข้อผิดพลาด: ${qrcodes.error}</p>`;
            return;
        }

        if (qrcodes.length > 0) {
            let html = '<ul>';
            qrcodes.forEach(item => {
                // Each item in secondary sidebar has a checkbox and shows its specific QR code and location
                html += `<li>
                                <input type="checkbox" class="qrcode-checkbox" data-qr-code="${item.qrCode}">
                                QR Code: ${item.qrCode}
                            </li>`;
            });
            html += '</ul>';
            productQRCodesContent.innerHTML = html;
        } else {
            productQRCodesContent.innerHTML = '<p>ไม่พบ QR Code สำหรับสินค้านี้ในตำแหน่งนี้</p>';
        }

    } catch (error) {
        console.error('Error fetching product QR codes for secondary sidebar:', error);
        productQRCodesContent.innerHTML = '<p style="color: red;">เกิดข้อผิดพลาดในการดึง QR Code. กรุณาลองใหม่อีกครั้ง.</p>';
    }
}

function closeProductQRCodesSidebar() {
    const productQRCodesSidebar = document.getElementById('product-qrcodes-sidebar');
    productQRCodesSidebar.classList.remove('open');
    document.body.classList.remove('secondary-sidebar-open');
}

// --- handleAddItem ---
async function handleAddItem() {
    const locationId = document.getElementById('current-location-id').innerText;
    const qrCode = document.getElementById('qrCodeInput').value.trim();
    const actionMessage = document.getElementById('action-message');

    if (!qrCode) {
        actionMessage.innerText = 'กรุณากรอก QR Code!';
        return;
    }

    actionMessage.innerText = 'กำลังเพิ่มสินค้า...';

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=add&locationId=${locationId}&qrCode=${qrCode}`
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.innerText = `เพิ่มสินค้า ${qrCode} สำเร็จ!`;
            document.getElementById('qrCodeInput').value = '';
            await openSidebar(currentActiveLocationId); // Re-fetch and display updated list for current location
            await applyLocationColors(); // Update location colors after adding item
        } else {
            actionMessage.innerText = `ข้อผิดพลาดในการเพิ่ม: ${result.error || 'ไม่ทราบสาเหตุ'}`;
        }
    } catch (error) {
        console.error('Error adding item:', error);
        actionMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (เพิ่มสินค้า)';
    }
}

// --- handleRemoveSelectedItems ---
async function handleRemoveSelectedItems() {
    const locationId = currentActiveLocationId; // Use the globally tracked active location
    const actionMessage = document.getElementById('action-message'); // Main sidebar's message area
    
    // Select checkboxes ONLY from the secondary sidebar
    const selectedCheckboxes = document.querySelectorAll('#product-qrcodes-sidebar .qrcode-checkbox:checked');

    if (selectedCheckboxes.length === 0) {
        actionMessage.innerText = 'กรุณาเลือก QR Code ที่ต้องการลบในหน้า QR Codes!';
        return;
    }

    const qrcodesToRemove = [];
    selectedCheckboxes.forEach(checkbox => {
        qrcodesToRemove.push(checkbox.dataset.qrCode); // Get the actual QR code from data attribute
    });
    
    actionMessage.innerText = 'กำลังลบสินค้าที่เลือก...';

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=removeSelected&locationId=${locationId}&qrcodes=${JSON.stringify(qrcodesToRemove)}`
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.innerText = `ลบสินค้าที่เลือกสำเร็จ: ${result.message}`;
            document.getElementById('qrCodeInput').value = ''; // Clear input field
            // Re-fetch and display updated list for current location (main sidebar)
            await openSidebar(currentActiveLocationId);
            closeProductQRCodesSidebar(); // Close secondary sidebar after deletion
            await applyLocationColors(); // Update location colors after removing item
        } else {
            actionMessage.innerText = `ข้อผิดพลาดในการลบ: ${result.error || 'ไม่ทราบสาเหตุ'}`;
        }
    } catch (error) {
        console.error('Error removing selected items:', error);
        actionMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ลบสินค้าที่เลือก)';
    }
}


// --- Functions for Relocate Modal (Multiple Items) ---
async function openRelocateModal() {
    const relocateModal = document.getElementById('relocate-modal');
    relocateModal.classList.add('open');
    
    document.getElementById('relocateQrCodeInput').value = ''; // Clear input
    document.getElementById('relocate-message').innerText = ''; // Clear message
    document.getElementById('relocate-items-list').innerHTML = ''; // Clear previous items in the list
    relocateItems = []; // Reset the array
    
    // Auto-focus on the input when modal opens
    setTimeout(() => {
        document.getElementById('relocateQrCodeInput').focus();
    }, 100);
}

function closeRelocateModal() {
    const relocateModal = document.getElementById('relocate-modal');
    relocateModal.classList.remove('open');
    // Clear list and reset array when closing
    document.getElementById('relocate-items-list').innerHTML = '';
    relocateItems = [];
    document.getElementById('relocateQrCodeInput').value = ''; // Ensure input is cleared on close
    document.getElementById('relocate-message').innerText = ''; // Ensure message is cleared on close
}

async function addRelocateItemToList() {
    const qrCode = document.getElementById('relocateQrCodeInput').value.trim();
    const relocateMessage = document.getElementById('relocate-message');
    const relocateItemsList = document.getElementById('relocate-items-list');

    relocateMessage.innerText = '';

    if (!qrCode) {
        relocateMessage.innerText = 'กรุณากรอก QR Code ที่ต้องการย้าย';
        return;
    }

    // Check if QR code is already in the list
    if (relocateItems.some(item => item.qrCode === qrCode)) {
        relocateMessage.innerText = `QR Code '${qrCode}' ถูกเพิ่มไปแล้วในรายการ`;
        document.getElementById('relocateQrCodeInput').value = ''; // Clear input
        return;
    }

    relocateMessage.innerText = `กำลังค้นหา Location ของ QR Code '${qrCode}'...`;

    try {
        const response = await fetch(`${WEB_APP_URL}?action=getQRCodeLocation&qrCode=${encodeURIComponent(qrCode)}`);
        const data = await response.json();

        if (data.error) {
            relocateMessage.innerText = `ข้อผิดพลาด: ${data.error}`;
            return;
        }

        if (data.location) {
            const oldLocation = data.location;
            
            // Add to internal array
            relocateItems.push({
                qrCode: qrCode,
                oldLocation: oldLocation,
                newLocation: '' // Initialize newLocation as empty
            });

            // Add to UI
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('relocate-item');
            itemDiv.dataset.qrCode = qrCode; // Store QR code on the element
            itemDiv.dataset.oldLocation = oldLocation; // Store old location on the element

            itemDiv.innerHTML = `
                <span class="qr-code-display">QR Code: ${qrCode}</span>
                <span class="old-location-display">จาก Location: ${oldLocation}</span>
                <input type="text" class="new-location-input" placeholder="ไป Location ใหม่: เช่น A-1, B-5">
                <button class="remove-relocate-item-btn" onclick="removeRelocateItem('${qrCode}')">ลบ</button>
            `;
            relocateItemsList.appendChild(itemDiv);

            // Add event listener for Enter key on the new location input
            const newLocationInput = itemDiv.querySelector('.new-location-input');
            newLocationInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.keyCode === 13) {
                    event.preventDefault();
                    document.getElementById('saveRelocateBtn').click(); // Trigger save
                }
            });

            relocateMessage.innerText = `QR Code '${qrCode}' พบใน Location: ${oldLocation} และเพิ่มในรายการแล้ว`;
            document.getElementById('relocateQrCodeInput').value = ''; // Clear input for next QR
            document.getElementById('relocateQrCodeInput').focus(); // Keep focus on input
        } else {
            relocateMessage.innerText = `ไม่พบ QR Code '${qrCode}' ในคลังสินค้า`;
        }

    } catch (error) {
        console.error('Error looking up QR code location:', error);
        relocateMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ค้นหา Location)';
    }
}

function removeRelocateItem(qrCodeToRemove) {
    // Remove from internal array
    relocateItems = relocateItems.filter(item => item.qrCode !== qrCodeToRemove);

    // Remove from UI
    const relocateItemsList = document.getElementById('relocate-items-list');
    const itemToRemove = relocateItemsList.querySelector(`.relocate-item[data-qr-code="${qrCodeToRemove}"]`);
    if (itemToRemove) {
        relocateItemsList.removeChild(itemToRemove);
    }
    document.getElementById('relocate-message').innerText = `ลบ QR Code '${qrCodeToRemove}' ออกจากรายการแล้ว`;
    document.getElementById('relocateQrCodeInput').focus(); // Focus back to input
}


async function handleRelocateSubmit() {
    const relocateMessage = document.getElementById('relocate-message');
    relocateMessage.innerText = 'กำลังบันทึกการย้ายสินค้า...';

    // Update newLocation in relocateItems array from UI inputs
    const itemElements = document.querySelectorAll('#relocate-items-list .relocate-item');
    let allValid = true;

    if (itemElements.length === 0) {
        relocateMessage.innerText = 'กรุณาเพิ่ม QR Code ที่ต้องการย้ายก่อน!';
        return;
    }

    relocateItems.forEach(item => {
        const correspondingElement = document.querySelector(`.relocate-item[data-qr-code="${item.qrCode}"]`);
        const newLocationInput = correspondingElement ? correspondingElement.querySelector('.new-location-input') : null;
        if (newLocationInput) {
            item.newLocation = newLocationInput.value.trim();

            // Validate new location format (e.g., A-1, B-5)
            // Updated regex to allow single digit columns and uppercase letters A-Z
            if (!/^[A-Z]-\d{1,2}$/.test(item.newLocation)) { 
                relocateMessage.innerText = `รูปแบบ Location ใหม่ไม่ถูกต้องสำหรับ ${item.qrCode} (เช่น A-1, B-5)`;
                allValid = false;
            } else if (item.newLocation === item.oldLocation) {
                relocateMessage.innerText = `Location ใหม่ของ ${item.qrCode} ซ้ำกับ Location เดิม`;
                allValid = false;
            }
        } else {
            allValid = false; // Should not happen if itemElements correctly represents relocateItems
        }
    });

    if (!allValid) {
        return; // Stop if any validation fails
    }

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=relocateMultiple&items=${encodeURIComponent(JSON.stringify(relocateItems))}`
        });

        const result = await response.json();

        if (result.success) {
            relocateMessage.innerText = `ย้ายสินค้าสำเร็จ: ${result.message}`;
            // Clear inputs and list after successful submission
            document.getElementById('relocateQrCodeInput').value = '';
            document.getElementById('relocate-items-list').innerHTML = '';
            relocateItems = []; // Reset the array
            
            // Optionally close the modal after a short delay
            setTimeout(() => {
                closeRelocateModal();
            }, 1500);

            // Re-fetch and display updated list for current location if main sidebar is open
            if (currentActiveLocationId) {
                await openSidebar(currentActiveLocationId);
            }
            await applyLocationColors(); // Update location colors after relocating

        } else {
            relocateMessage.innerText = `ข้อผิดพลาดในการย้าย: ${result.error || 'ไม่ทราบสาเหตุ'}`;
        }
    } catch (error) {
        console.error('Error relocating items:', error);
        relocateMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ย้ายสินค้าหลายรายการ)';
    }
}

// --- Functions for QR Search Modal ---
async function openSearchModal() {
    const searchModal = document.getElementById('search-modal');
    searchModal.classList.add('open');
    
    document.getElementById('searchQrCodeInput').value = ''; // Clear input
    document.getElementById('search-message').innerText = ''; // Clear message
    document.getElementById('search-items-list').innerHTML = ''; // Clear previous items in the list
    searchItems = []; // Reset the array
    
    // Auto-focus on the input when modal opens
    setTimeout(() => {
        document.getElementById('searchQrCodeInput').focus();
    }, 100);
}

function closeSearchModal() {
    const searchModal = document.getElementById('search-modal');
    searchModal.classList.remove('open');
    // Clear list and reset array when closing
    document.getElementById('search-items-list').innerHTML = '';
    searchItems = [];
    document.getElementById('searchQrCodeInput').value = ''; // Ensure input is cleared on close
    document.getElementById('search-message').innerText = ''; // Ensure message is cleared on close
}

async function addSearchItemToList() {
    const qrCode = document.getElementById('searchQrCodeInput').value.trim();
    const searchMessage = document.getElementById('search-message');
    const searchItemsList = document.getElementById('search-items-list');

    searchMessage.innerText = '';

    if (!qrCode) {
        searchMessage.innerText = 'กรุณากรอก QR Code ที่ต้องการค้นหา';
        return;
    }

    // Check if QR code is already in the list
    if (searchItems.some(item => item.qrCode === qrCode)) {
        searchMessage.innerText = `QR Code '${qrCode}' ถูกเพิ่มไปแล้วในรายการค้นหา`;
        document.getElementById('searchQrCodeInput').value = ''; // Clear input
        return;
    }

    searchMessage.innerText = `กำลังค้นหาตำแหน่งของ QR Code '${qrCode}'...`;

    try {
        const response = await fetch(`${WEB_APP_URL}?action=getQRCodeLocation&qrCode=${encodeURIComponent(qrCode)}`);
        const data = await response.json();

        if (data.error) {
            searchMessage.innerText = `ข้อผิดพลาด: ${data.error}`;
            return;
        }

        const foundLocation = data.location;
        
        // Add to internal array
        searchItems.push({
            qrCode: qrCode,
            foundLocation: foundLocation || 'ไม่พบ' // Store found location or 'ไม่พบ'
        });

        // Add to UI
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('search-item'); // Use new class for search items
        itemDiv.dataset.qrCode = qrCode; // Store QR code on the element

        itemDiv.innerHTML = `
            <span class="qr-code-display">QR Code: ${qrCode}</span>
            <span class="found-location-display">ตำแหน่ง: ${foundLocation || 'ไม่พบ'}</span>
            <button class="remove-search-item-btn" onclick="removeSearchItem('${qrCode}')">ลบ</button>
        `;
        searchItemsList.appendChild(itemDiv);

        searchMessage.innerText = `QR Code '${qrCode}' ${foundLocation ? 'พบในตำแหน่ง: ' + foundLocation : 'ไม่พบในคลังสินค้า'}`;
        document.getElementById('searchQrCodeInput').value = ''; // Clear input for next QR
        document.getElementById('searchQrCodeInput').focus(); // Keep focus on input

    } catch (error) {
        console.error('Error looking up QR code location for search:', error);
        searchMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ค้นหาตำแหน่ง)';
    }
}

function removeSearchItem(qrCodeToRemove) {
    // Remove from internal array
    searchItems = searchItems.filter(item => item.qrCode !== qrCodeToRemove);

    // Remove from UI
    const searchItemsList = document.getElementById('search-items-list');
    const itemToRemove = searchItemsList.querySelector(`.search-item[data-qr-code="${qrCodeToRemove}"]`);
    if (itemToRemove) {
        searchItemsList.removeChild(itemToRemove);
    }
    document.getElementById('search-message').innerText = `ลบ QR Code '${qrCodeToRemove}' ออกจากรายการค้นหาแล้ว`;
    document.getElementById('searchQrCodeInput').focus(); // Focus back to input
}

// --- NEW Functions for Product Search Modal ---
function openProductSearchModal() {
    const productSearchModal = document.getElementById('product-search-modal');
    productSearchModal.classList.add('open');
    
    document.getElementById('productNameInput').value = ''; // Clear input
    document.getElementById('product-search-message').innerText = ''; // Clear message
    document.getElementById('product-search-results-list').innerHTML = ''; // Clear previous results
    productSearchResults = []; // Reset the array
    
    // Auto-focus on the input when modal opens
    setTimeout(() => {
        document.getElementById('productNameInput').focus();
    }, 100);
}

function closeProductSearchModal() {
    const productSearchModal = document.getElementById('product-search-modal');
    productSearchModal.classList.remove('open');
    // Clear list and reset array when closing
    document.getElementById('product-search-results-list').innerHTML = '';
    productSearchResults = [];
    document.getElementById('productNameInput').value = ''; // Ensure input is cleared on close
    document.getElementById('product-search-message').innerText = ''; // Ensure message is cleared on close
}

async function performProductSearch() {
    const productName = document.getElementById('productNameInput').value.trim();
    const productSearchMessage = document.getElementById('product-search-message');
    const productSearchResultsList = document.getElementById('product-search-results-list');

    productSearchMessage.innerText = '';
    productSearchResultsList.innerHTML = ''; // Clear previous results before new search
    productSearchResults = []; // Reset the array for new search

    if (!productName) {
        productSearchMessage.innerText = 'กรุณากรอกชื่อสินค้าที่ต้องการค้นหา';
        return;
    }

    productSearchMessage.innerText = `กำลังค้นหาสินค้าชื่อ '${productName}'...`;

    try {
        const response = await fetch(`${WEB_APP_URL}?action=getQRCodesByProductName&productName=${encodeURIComponent(productName)}`);
        const data = await response.json();

        if (data.error) {
            productSearchMessage.innerText = `ข้อผิดพลาด: ${data.error}`;
            return;
        }

        const results = data.items; // Expecting an array of {qrCode, productName, location}

        if (results.length > 0) {
            let html = '';
            results.forEach(item => {
                productSearchResults.push(item); // Add to internal array
                html += `
                    <div class="product-search-result-item">
                        <span class="product-name-display">ชื่อสินค้า: ${item.productName}</span>
                        <span class="qr-code-display">QR Code: ${item.qrCode}</span>
                        <span class="location-display">ตำแหน่ง: ${item.location}</span>
                    </div>
                `;
            });
            productSearchResultsList.innerHTML = html;
            productSearchMessage.innerText = `พบสินค้า '${productName}' ทั้งหมด ${results.length} รายการ`;
        } else {
            productSearchMessage.innerText = `ไม่พบสินค้าชื่อ '${productName}' ในคลังสินค้า`;
        }
        document.getElementById('productNameInput').focus(); // Keep focus on input
        
    } catch (error) {
        console.error('Error performing product search:', error);
        productSearchMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ค้นหาสินค้าตามชื่อ)';
    }
}