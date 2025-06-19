/**
 * @file script.js
 * @description Client-side JavaScript for the Healing Reservation Form.
 * Handles new report selection logic, dynamic fields for part appraisal,
 * real-time price calculation with conditional fees, validation, and copy to clipboard.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const reservationForm = document.getElementById('reservationForm');
    const requesterNameInput = document.getElementById('requesterNameInput');
    const reportOptionsContainer = document.getElementById('report-options-container');
    const partAppraisalDetails = document.getElementById('part-appraisal-details');
    const partList = document.getElementById('part-list');
    const addPartBtn = document.getElementById('add-part-btn');
    const consultationQtyInput = document.querySelector('input[name="consultation_qty"]');

    const selectedList = document.getElementById('selectedList');
    const totalEl = document.getElementById('totalAmount');
    const totalAmountHidden = document.getElementById('totalAmountHidden');

    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const lineSubmitBtn = document.getElementById('lineSubmitBtn');
    const validationMessageEl = document.getElementById('validation-message');

    // --- Constants ---
    const HEALING_FEE = 5000;
    const CONVENIENCE_STORE_FEE = 220;

    // --- Helper Functions ---
    const formatPrice = (amount) => new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY'
    }).format(amount);

    function updateAllQuantityDisplays() {
        document.querySelectorAll('.controls.option').forEach(ctrl => {
            const input = ctrl.querySelector('input[type="number"]');
            const qtySpan = ctrl.querySelector('.qty strong');
            if (input && qtySpan) qtySpan.textContent = input.value;
        });
    }

    function addPartItem(isFirst = false) {
        const index = partList.children.length;
        const partItem = document.createElement('div');
        partItem.className = 'dynamic-item';

        const input = document.createElement('input');
        input.type = 'text';
        input.name = `part_name_${index}`;
        input.placeholder = `指定部位 ${index + 1}`;
        partItem.appendChild(input);

        if (!isFirst) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-item';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => {
                partItem.remove();
                recount();
            });
            partItem.appendChild(removeBtn);
        }
        partList.appendChild(partItem);
    }

    function recount() {
        let subtotal = 0;
        selectedList.innerHTML = '';

        // 1. Basic Healing Fee
        if (requesterNameInput.value.trim()) {
            subtotal += HEALING_FEE;
            selectedList.innerHTML += `<li><span>基本ヒーリング料</span><span>${formatPrice(HEALING_FEE)}</span></li>`;
        }

        // 2. Report Type
        const selectedReportRadio = document.querySelector('input[name="report_type"]:checked');
        if (selectedReportRadio) {
            const fullLabelText = document.querySelector(`label[for="${selectedReportRadio.id}"]`).textContent.trim();
            const reportLabel = fullLabelText.split('(')[0].trim(); // Get text before parenthesis

            if (selectedReportRadio.value === 'part') {
                const pricePerPart = parseInt(selectedReportRadio.dataset.pricePerItem) || 0;
                const partInputs = partList.querySelectorAll('input[type="text"]');
                partInputs.forEach((input) => {
                    if (input.value.trim()) {
                        subtotal += pricePerPart;
                        selectedList.innerHTML += `<li><span>${reportLabel}: ${input.value.trim()}</span><span>${formatPrice(pricePerPart)}</span></li>`;
                    }
                });
            } else {
                const reportPrice = parseInt(selectedReportRadio.dataset.price) || 0;
                subtotal += reportPrice;
                if (reportPrice > 0) {
                    selectedList.innerHTML += `<li><span>${reportLabel}</span><span>${formatPrice(reportPrice)}</span></li>`;
                } else {
                    selectedList.innerHTML += `<li><span>${reportLabel}</span><span>${formatPrice(0)}</span></li>`;
                }
            }
        }

        // 3. Additional Options (Consultation)
        const consultationQty = parseInt(consultationQtyInput.value) || 0;
        if (consultationQty > 0) {
            const price = parseInt(consultationQtyInput.dataset.price);
            const label = consultationQtyInput.dataset.label;
            subtotal += price * consultationQty;
            selectedList.innerHTML += `<li><span>${label} × ${consultationQty}</span><span>${formatPrice(price * consultationQty)}</span></li>`;
            
            // 4. Conditional Connection Fee (triggered by consultation)
            if (selectedReportRadio) {
                const connectionFee = parseInt(selectedReportRadio.dataset.connectionFee) || 0;
                if (connectionFee > 0) {
                    subtotal += connectionFee;
                    const fullLabelText = document.querySelector(`label[for="${selectedReportRadio.id}"]`).textContent.trim();
                    const reportLabelForFee = fullLabelText.split('(')[0].trim();
                    selectedList.innerHTML += `<li><span>霊視接続料 ${reportLabelForFee} オプション利用</span><span>${formatPrice(connectionFee)}</span></li>`;
                }
            }
        }

        // 5. Discounts
        let finalTotal = subtotal;
        const selectedCoupon = document.querySelector('input[name="coupon_type"]:checked')?.value;
        if (selectedCoupon === 'referral') {
            finalTotal -= 500;
            selectedList.innerHTML += `<li><span>紹介割引</span><span>${formatPrice(-500)}</span></li>`;
        } else if (selectedCoupon === 'percent') {
            const percent = parseInt(document.getElementById('percent-off-value').value) || 0;
            if (percent > 0 && percent < 100) {
                const discount = Math.round(subtotal * (percent / 100));
                finalTotal -= discount;
                selectedList.innerHTML += `<li><span>${percent}% OFF クーポン</span><span>${formatPrice(-discount)}</span></li>`;
            }
        }

        // 6. Payment Method Fee
        if (document.getElementById('payment_method').value === 'コンビニ払い') {
            finalTotal += CONVENIENCE_STORE_FEE;
            selectedList.innerHTML += `<li><span>コンビニ払い手数料</span><span>${formatPrice(CONVENIENCE_STORE_FEE)}</span></li>`;
        }

        totalEl.textContent = formatPrice(finalTotal > 0 ? finalTotal : 0);
        totalAmountHidden.value = finalTotal > 0 ? finalTotal : 0;
    }

    function validateForm() {
        let isValid = true;
        let firstErrorElement = null;
        validationMessageEl.textContent = '';
        validationMessageEl.style.display = 'none';
        document.querySelectorAll('.error-highlight').forEach(el => el.classList.remove('error-highlight'));

        const addError = (element, message) => {
            isValid = false;
            if (element) {
                element.classList.add('error-highlight');
                if (!firstErrorElement) {
                    firstErrorElement = element;
                    validationMessageEl.textContent = message;
                    validationMessageEl.style.display = 'block';
                }
            }
        };

        if (!requesterNameInput.value.trim()) addError(requesterNameInput, 'お名前は必須です。');

        const selectedReportRadio = document.querySelector('input[name="report_type"]:checked');
        if (!selectedReportRadio) {
            addError(reportOptionsContainer, '報告タイプを選択してください。');
        } else if (selectedReportRadio.value === 'part') {
            const hasPartInput = Array.from(partList.querySelectorAll('input[type="text"]')).some(input => input.value.trim() !== '');
            if (!hasPartInput) {
                addError(partAppraisalDetails, '１部位鑑定表を選択した場合は、指定部位を1つ以上入力してください。');
            }
        }

        if (!document.querySelector('input[name="coupon_type"]:checked')) {
            addError(document.getElementById('coupon-group'), 'クーポンの有無を選択してください。');
        }

        if (!document.getElementById('payment_method').value) addError(document.getElementById('payment_method'), 'お支払い方法は必須です。');
        if (!document.querySelector('input[name="agree_all"]').checked) addError(document.querySelector('.agree-final'), 'ご確認事項への同意は必須です。');

        if (!isValid && firstErrorElement) {
            firstErrorElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
        return isValid;
    }

    function resetForm() {
        reservationForm.reset();
        partList.innerHTML = '';
        partAppraisalDetails.classList.add('hidden-details');
        document.querySelectorAll('input[name="coupon_type"]').forEach(radio => radio.checked = false);
        document.querySelectorAll('.error-highlight').forEach(el => el.classList.remove('error-highlight'));
        validationMessageEl.style.display = 'none';
        updateAllQuantityDisplays();
        recount();
    }

    function generateEstimateText() {
        recount();
        let text = '【ヒーリングお申し込み内容】\n\n';
        text += `お名前: ${requesterNameInput.value.trim()}\n\n`;

        document.querySelectorAll('#selectedList li').forEach(li => {
            const itemText = li.querySelector('span:first-child').textContent.trim();
            const itemPrice = li.querySelector('span:last-child').textContent.trim();
            text += `${itemText}  ${itemPrice}\n`;
        });

        text += `\n--------------------------------\n`;
        text += `合計金額: ${document.getElementById('totalAmount').textContent.trim()}\n`;
        text += `--------------------------------\n\n`;

        const paymentSelect = document.getElementById('payment_method');
        const paymentMethod = paymentSelect.value ? paymentSelect.options[paymentSelect.selectedIndex].text : '未選択';
        text += `お支払い方法: ${paymentMethod}\n`;

        const remarks = document.getElementById('remarks').value.trim();
        if (remarks) {
            text += `\n備考:\n${remarks}\n`;
        }

        text += '\n上記の内容で申し込みます。';
        return text;
    }

    // --- Event Listeners ---
    reservationForm.addEventListener('input', recount);
    reservationForm.addEventListener('change', recount);

    reportOptionsContainer.addEventListener('change', (e) => {
        if (e.target.name === 'report_type') {
            if (e.target.value === 'part') {
                partAppraisalDetails.classList.remove('hidden-details');
                if (partList.children.length === 0) {
                    addPartItem(true);
                }
            } else {
                partAppraisalDetails.classList.add('hidden-details');
            }
        }
    });

    addPartBtn.addEventListener('click', () => addPartItem());

    document.querySelectorAll('.controls.option').forEach(ctrl => {
        const input = ctrl.querySelector('input[type="number"]');
        ctrl.addEventListener('click', (e) => {
            if (input.disabled) return;
            const currentVal = parseInt(input.value);
            if (e.target.classList.contains('plus')) {
                input.value = Math.min(currentVal + 1, input.max || 99);
            } else if (e.target.classList.contains('minus')) {
                input.value = Math.max(currentVal - 1, 0);
            }
            updateAllQuantityDisplays();
            recount();
        });
    });

    clearBtn.addEventListener('click', resetForm);

    copyBtn.addEventListener('click', () => {
        if (!validateForm()) return;

        const estimateText = generateEstimateText();
        navigator.clipboard.writeText(estimateText).then(() => {
            alert('申込内容をコピーしました！');
        }).catch(err => {
            console.error('コピーに失敗しました: ', err);
            alert('コピーに失敗しました。お手数ですが、スクリーンショットを送信してください。');
        });
    });

    lineSubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const estimateText = generateEstimateText();
        navigator.clipboard.writeText(estimateText).then(() => {
            alert('申込内容をコピーしました。LINEに貼り付けて送信してください。');
            setTimeout(() => {
                window.open('https://line.me/ti/p/Kv76GQK_UI', '_blank');
            }, 300);
        }).catch(err => {
            console.error('コピーに失敗しました: ', err);
            alert('コピーに失敗しました。お手数ですが、スクリーンショットをLINEで送信してください。');
        });
    });

    // --- Initial Setup ---
    resetForm();
});