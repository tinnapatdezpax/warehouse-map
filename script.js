// script.js

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyGz5ruLtT5CJehNCEbimRv9kpfCOomnNDKNOl-YuY0AhG3QB0CLCNlnXEQQj3pUuy0mA/exec'; // !!! IMPORTANT: Replace with your deployed Google Apps Script Web App URL !!!

// Global variable to store currently active location ID
let currentActiveLocationId = '';

document.addEventListener('DOMContentLoaded', () => {
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

    // Add Enter key functionality to QR code input
    const qrCodeInput = document.getElementById('qrCodeInput');
    if (qrCodeInput) {
        qrCodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                handleAddItem();
            }
        });
    }

    // Add Enter key functionality to relocate QR code input (in modal)
    const relocateQrCodeInput = document.getElementById('relocateQrCodeInput');
    if (relocateQrCodeInput) {
        relocateQrCodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                handleRelocateLookup();
            }
        });
    }

    // Add Enter key functionality to new location input (in modal)
    const newLocationInput = document.getElementById('newLocationInput');
    if (newLocationInput) {
        newLocationInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                handleRelocateSubmit();
            }
        });
    }
});

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
                            <div class="product-info">
                                <strong>${item.productName}</strong><br>
                                จำนวน: ${item.count} ชิ้น
                            </div>
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
    document.body.classList.remove('secondary-sidebar-open'); // Remove body margin
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
        } else {
            actionMessage.innerText = `ข้อผิดพลาดในการลบ: ${result.error || 'ไม่ทราบสาเหตุ'}`;
        }
    } catch (error) {
        console.error('Error removing selected items:', error);
        actionMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ลบสินค้าที่เลือก)';
    }
}


// --- New Functions for Relocate Modal ---
function openRelocateModal() {
    const relocateModal = document.getElementById('relocate-modal');
    relocateModal.classList.add('open');
    document.getElementById('relocateQrCodeInput').value = ''; // Clear input
    document.getElementById('relocate-message').innerText = ''; // Clear message
    document.getElementById('relocate-details').style.display = 'none'; // Hide details section
    document.getElementById('current-item-location').innerText = ''; // Clear current location
    document.getElementById('newLocationInput').value = ''; // Clear new location
}

function closeRelocateModal() {
    const relocateModal = document.getElementById('relocate-modal');
    relocateModal.classList.remove('open');
}

async function handleRelocateLookup() {
    const qrCode = document.getElementById('relocateQrCodeInput').value.trim();
    const relocateMessage = document.getElementById('relocate-message');
    const relocateDetails = document.getElementById('relocate-details');
    const currentItemLocationSpan = document.getElementById('current-item-location');

    relocateMessage.innerText = '';
    relocateDetails.style.display = 'none'; // Hide details until found
    currentItemLocationSpan.innerText = ''; // Clear previous data

    if (!qrCode) {
        relocateMessage.innerText = 'กรุณากรอก QR Code ที่ต้องการย้าย';
        return;
    }

    relocateMessage.innerText = 'กำลังค้นหา Location ของ QR Code...';

    try {
        const response = await fetch(`${WEB_APP_URL}?action=getQRCodeLocation&qrCode=${encodeURIComponent(qrCode)}`);
        const data = await response.json();

        if (data.error) {
            relocateMessage.innerText = `ข้อผิดพลาด: ${data.error}`;
            return;
        }

        if (data.location) {
            currentItemLocationSpan.innerText = data.location;
            relocateDetails.style.display = 'block'; // Show the next section
            relocateMessage.innerText = `QR Code '${qrCode}' พบใน Location: ${data.location}`;
            // Store original location for submission, maybe in a data attribute or global var
            relocateDetails.dataset.originalLocation = data.location; // Store for submission
        } else {
            relocateMessage.innerText = `ไม่พบ QR Code '${qrCode}' ในคลังสินค้า`;
        }

    } catch (error) {
        console.error('Error looking up QR code location:', error);
        relocateMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ค้นหา Location)';
    }
}

async function handleRelocateSubmit() {
    const qrCode = document.getElementById('relocateQrCodeInput').value.trim();
    const oldLocation = document.getElementById('relocate-details').dataset.originalLocation;
    const newLocation = document.getElementById('newLocationInput').value.trim();
    const relocateMessage = document.getElementById('relocate-message');

    relocateMessage.innerText = '';

    if (!qrCode || !oldLocation || !newLocation) {
        relocateMessage.innerText = 'กรุณากรอกข้อมูลให้ครบถ้วน (QR Code, Location เดิม, Location ใหม่)';
        return;
    }

    // Basic validation for new location format (optional, but good practice)
    // You might want to add more robust validation based on your A-1, B-2 format
    if (!/^[A-H]-\d{1,2}$/.test(newLocation)) {
        relocateMessage.innerText = 'รูปแบบ Location ใหม่ไม่ถูกต้อง (เช่น A-1, B-5)';
        return;
    }

    if (newLocation === oldLocation) {
        relocateMessage.innerText = 'Location ใหม่ซ้ำกับ Location เดิม';
        return;
    }

    relocateMessage.innerText = 'กำลังบันทึกการย้ายสินค้า...';

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=relocate&qrCode=${encodeURIComponent(qrCode)}&oldLocation=${encodeURIComponent(oldLocation)}&newLocation=${encodeURIComponent(newLocation)}`
        });

        const result = await response.json();

        if (result.success) {
            relocateMessage.innerText = `ย้ายสินค้า ${qrCode} สำเร็จ: ${result.message}`;
            document.getElementById('relocateQrCodeInput').value = '';
            document.getElementById('newLocationInput').value = '';
            document.getElementById('relocate-details').style.display = 'none'; // Hide details after success
            document.getElementById('current-item-location').innerText = ''; // Clear old location text

            // After successful relocation, refresh the current sidebar if it's open
            // This is crucial to reflect the change in the UI
            if (currentActiveLocationId) {
                await openSidebar(currentActiveLocationId);
            }
            // If the item was moved out of currentActiveLocationId, that location will now reflect the change.
            // If it was moved into currentActiveLocationId, that location will also reflect the change.

        } else {
            relocateMessage.innerText = `ข้อผิดพลาดในการย้าย: ${result.error || 'ไม่ทราบสาเหตุ'}`;
        }
    } catch (error) {
        console.error('Error relocating item:', error);
        relocateMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ย้ายสินค้า)';
    }
}