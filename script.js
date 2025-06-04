// script.js

// !!! IMPORTANT: Replace with your deployed Google Apps Script Web App URL !!!
// To get this URL:
// 1. Go to your Google Sheet > Extensions > Apps Script
// 2. Paste the Apps Script code below into Code.gs
// 3. Click "Deploy" > "New deployment"
// 4. Select "Web app" as type
// 5. For "Execute as:", choose "Me"
// 6. For "Who has access:", choose "Anyone"
// 7. Click "Deploy" and copy the Web app URL.
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyGz5ruLtT5CJehNCEbimRv9kpfCOomnNDKNOl-YuY0AhG3QB0CLCNlnXEQQj3pUuy0mA/exec'; 

document.addEventListener('DOMContentLoaded', () => {
    const warehouseMap = document.getElementById('warehouse-map');
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 10 }, (_, i) => i + 1); // 1 to 10

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
});

async function openSidebar(locationId) {
    const sidebar = document.getElementById('item-details-sidebar');
    const currentLocationIdSpan = document.getElementById('current-location-id');
    const detailsContent = document.getElementById('details-content');

    currentLocationIdSpan.innerText = locationId;
    detailsContent.innerHTML = '<p>กำลังโหลดข้อมูล...</p>'; // Show loading message
    sidebar.classList.add('open'); // Open the sidebar immediately

    try {
        const response = await fetch(`${WEB_APP_URL}?locationId=${locationId}`);
        const data = await response.json(); // Data will be an array of objects or an error

        if (data.error) {
            detailsContent.innerHTML = `<p style="color: red;">ข้อผิดพลาด: ${data.error}</p>`;
            return;
        }

        if (data.length > 0) {
            let html = '<ul>';
            // Group items by product name and count their quantity
            const itemCounts = {};
            data.forEach(item => {
                if (itemCounts[item.productName]) {
                    itemCounts[item.productName].count++;
                    itemCounts[item.productName].qrcodes.push(item.qrCode);
                } else {
                    itemCounts[item.productName] = {
                        count: 1,
                        qrCode: item.qrCode, // Store one example QR code
                        qrcodes: [item.qrCode] // Store all QR codes if needed for display
                    };
                }
            });

            for (const productName in itemCounts) {
                const item = itemCounts[productName];
                html += `<li>
                            <strong>${productName}</strong><br>
                            จำนวน: ${item.count} ชิ้น<br>
                            QR Code (ตัวอย่าง): ${item.qrCode}
                            </li>`;
            }
            html += '</ul>';
            detailsContent.innerHTML = html;
        } else {
            detailsContent.innerHTML = '<p>ไม่มีสินค้าในตำแหน่งนี้</p>';
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        detailsContent.innerHTML = '<p style="color: red;">เกิดข้อผิดพลาดในการดึงข้อมูล. กรุณาลองใหม่อีกครั้ง.</p>';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('item-details-sidebar');
    sidebar.classList.remove('open');
}
// script.js (ต่อจากโค้ดเดิม)

// ... (existing code for openSidebar, closeSidebar, etc.) ...

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
                'Content-Type': 'application/x-www-form-urlencoded', // Common for Apps Script doPost(e)
            },
            body: `action=add&locationId=${locationId}&qrCode=${qrCode}`
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.innerText = `เพิ่มสินค้า ${qrCode} สำเร็จ!`;
            document.getElementById('qrCodeInput').value = ''; // Clear input
            // Refresh details in sidebar after adding
            await openSidebar(locationId); // Re-fetch and display updated list
        } else {
            actionMessage.innerText = `ข้อผิดพลาดในการเพิ่ม: ${result.error || 'ไม่ทราบสาเหตุ'}`;
        }
    } catch (error) {
        console.error('Error adding item:', error);
        actionMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (เพิ่มสินค้า)';
    }
}
async function handleRemoveItem() {
    const locationId = document.getElementById('current-location-id').innerText;
    const qrCode = document.getElementById('qrCodeInput').value.trim();
    const actionMessage = document.getElementById('action-message');

    if (!qrCode) {
        actionMessage.innerText = 'กรุณากรอก QR Code ที่ต้องการลบ!';
        return;
    }

    actionMessage.innerText = 'กำลังลบสินค้า...';

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=remove&locationId=${locationId}&qrCode=${qrCode}`
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.innerText = `ลบสินค้า ${qrCode} สำเร็จ!`;
            document.getElementById('qrCodeInput').value = ''; // Clear input
            // Refresh details in sidebar after removing
            await openSidebar(locationId); // Re-fetch and display updated list
        } else {
            actionMessage.innerText = `ข้อผิดพลาดในการลบ: ${result.error || 'ไม่ทราบสาเหตุ'}`;
        }
    } catch (error) {
        console.error('Error removing item:', error);
        actionMessage.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ (ลบสินค้า)';
    }
}