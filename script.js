let address = [];

let jntData = [];
let smsData = [];

let smsDataWrongShippingFee = [];
let smsDataWrongNumber = [];
let smsDataRepeatedCustomers = [];
let smsDataOtherPaymentModes = [];
let smsDataFreeShipping = [];
let smsDataBillingShipping = [];

updateButtons();
initializeAddress();

async function upload(type) {
    document.querySelector('.loading').classList = 'd-block loading';

    jntData = [];
    smsData = [];
    
    smsDataWrongShippingFee = [];
    smsDataWrongNumber = [];
    smsDataRepeatedCustomers = [];
    smsDataOtherPaymentModes = [];
    smsDataFreeShipping = [];

    let raw = await processFiles();
    if (raw != null) {
        if (type === 'jnt') {
            processJntData(raw);
            jntData.unshift(['#', 'Order Number', 'Receiver', 'Receiver Telephone', 'Receiver Address', 'Receiver Province', 'Receiver City', 'Receiver Region', 'Express Type', 'Parcel Name', 'Weight', 'Total Parcels', 'Parcel Value', 'COD', 'Remarks']);
            createJntTable();
        } else {
            processSmsData(raw);

            createSmsTable();

            createSmsTableOthers('wrong-shipping-fee');

            createSmsTableOthers('free-shipping');

            createSmsTableOthers('wrong-number');

            createSmsTableOthers('repeated-customers');

            createSmsTableOthers('other-payment-modes');

            createSmsTableOthers('billing-shipping');
        }
    }

    document.querySelector('.loading').classList = 'd-none loading';
}

async function processFiles() {
    let formFile = document.querySelector('#file');
    let files = formFile.files;
    
    if (!files) {
        alert("This browser doesn't seem to support the `files` property of file inputs.");
        return null;
    } else if (!files[0]) {
        alert("No file selected.");
        return null;
    } else {
        document.querySelectorAll('.table-header').forEach(element => {
            element.innerHTML = '';
        });
        document.querySelectorAll('.table-body').forEach(element => {
            element.innerHTML = '';
        });

        let data = [];
        let promises = [];
        for (let i = 0; i < files.length; i++) {
            let promise = new Promise((resolve, reject) => {
                let fr = new FileReader();  
                fr.onload = () => {
                    resolve($.csv.toArrays(fr.result));
                };
                fr.onerror = reject;
                fr.readAsText(files.item(i));
            });

            promises.push(promise);
        }

        await Promise.all(promises).then((values) => {
            values.forEach(it => {
                data = [...data, ...it.slice(1)];
            });

            data.sort((a, b) => a[0].localeCompare(b[0]));
        });

        return data;
    }
}

function processJntData(raw) {
    let data = [];

    let includeOrders = document.querySelector('#includeOrders').value.split(' ');
    let excludeNames = document.querySelector('#excludeNames').value.split(' ');
    let overrideExcludeNames = document.querySelector('#overrideExcludeNames').value.split(' ');
    let excludeOrders = document.querySelector('#excludeOrders').value.split(' ');

    let combineOrders = document.querySelector('#combineOrders').value.split(' ');
    let combinedOrders = [];
    combineOrders.forEach((it, index) => {
        let parts = it.split('=');
        combinedOrders[index] = [];
        combinedOrders[index][0] = parts[0].split(',');
        combinedOrders[index][1] = parts[1];
    });

    for (let i = 0; i < raw.length; i++) {
        let orderNumber = raw[i][0].substring(8);

        if (excludeNames.some(it => raw[i][34].includes(it)) && !overrideExcludeNames.includes(orderNumber)) {
            continue;
        }

        if (excludeOrders.includes(orderNumber)) {
            continue;
        }
        
        if (raw[i][2] == 'voided' || raw[i][2] == '') {
            continue;
        }

        let isAlreadyCombined = false;
        let groupDetails = [];
        combinedOrders.forEach(it => {
            if (it[0].includes(orderNumber)) {
                if (it[0].indexOf(orderNumber) === 0) {
                    groupDetails = it;
                } else {
                    isAlreadyCombined = true;
                }
            }
        });

        if (isAlreadyCombined) {
            continue;
        }

        if (includeOrders[0] != '') {
            let isIncluded = false;
    
            includeOrders.forEach(it => {
                if (it.includes('-')) {
                    let range = it.split('-');
                    if (orderNumber >= range[0] && orderNumber <= range[1]) {
                        isIncluded = true;
                    }
                } else if (orderNumber == it) {
                    isIncluded = true;
                }
            });
    
            if (!isIncluded) {
                continue;
            }
        }

        let row = [];

        // Order Number
        row.push(orderNumber);

        // Receiver
        row.push(convertToTitleCase(raw[i][34]));

        // Receiver Telephone
        row.push(formatPhoneNumber(raw[i][43]));

        // Receiver Address
        row.push(raw[i][35]);

        // Receiver Province
        row.push(getProvince(raw[i][41]));
        
        // Receiver City
        row.push(raw[i][39]);
        
        // Receiver Region
        row.push('');

        // Express Type
        row.push('EZ');

        // Parcel Name
        row.push('QUINTAS ACCESSORIES');

        // Weight
        row.push('0.50');

        // Total Parcels
        let count = 0;
        let rows = 0;

        for (let j = 0; j < raw.length; j++) {
            if (raw[i + j] == null) {
                break;
            } else if (j > 0 && raw[i + j][13] != "") {
                break;
            } else if (raw[i + j][17] != 'Tip') {
                count += parseInt(raw[i + j][16]);
            }

            rows++;
        }

        if (groupDetails.length > 0) {
            groupDetails[0].forEach((item, index) => {
                if (index === 0) {
                    return;
                }

                let row = raw.find(it => it[0].includes(item));
                let rowIndex = raw.indexOf(row);

                for (let j = 0; j < raw.length; j++) {
                    if (raw[rowIndex + j] == null) {
                        break;
                    } else if (j > 0 && raw[rowIndex + j][13] != "") {
                        break;
                    } else if (raw[rowIndex + j][17] != 'Tip') {
                        count += parseInt(raw[rowIndex + j][16]);
                    }
                }
            });
        }

        row.push(count);

        // Parcel Value
        row.push('549');

        // COD
        let cod;
        if (groupDetails.length > 0) {
            cod = raw[i][2] == 'paid' ? "0" : groupDetails[1];
        } else {
            cod = raw[i][2] == 'paid' ? "0" : raw[i][11];
        }
        row.push(cod);

        // Remarks
        row.push('VIP');

        data.push(row);
        
        i += (rows - 1);
    }

    jntData = data;
}

function processSmsData(raw) {
    let data = [];
    let repeatedCustomers = [];
    let wrongNumber = [];
    let otherPaymentModes = [];
    let wrongShippingFee = [];
    let freeShipping = [];
    let billingShipping = [];

    let includeOrders = document.querySelector('#includeOrders').value.split(' ');
    let excludeNames = document.querySelector('#excludeNames').value.split(' ');
    let overrideExcludeNames = document.querySelector('#overrideExcludeNames').value.split(' ');
    let excludeOrders = document.querySelector('#excludeOrders').value.split(' ');

    for (let i = 0; i < raw.length; i++) {
        let orderNumber = raw[i][0].substring(8);

        if (excludeNames.some(it => raw[i][34].includes(it)) && !overrideExcludeNames.includes(orderNumber)) {
            continue;
        }

        if (excludeOrders.includes(orderNumber)) {
            continue;
        }
        
        if (raw[i][2] == 'voided' || raw[i][2] == '') {
            continue;
        }

        if (includeOrders[0] != '') {
            let isIncluded = false;
    
            includeOrders.forEach(it => {
                if (it.includes('-')) {
                    let range = it.split('-');
                    if (orderNumber >= range[0] && orderNumber <= range[1]) {
                        isIncluded = true;
                    }
                } else if (orderNumber == it) {
                    isIncluded = true;
                }
            });
    
            if (!isIncluded) {
                continue;
            }
        }

        let row = {};
        let isPaid = raw[i][2] == 'paid';

        // Order Number
        row.orderNumber = orderNumber;

        // Name
        row.name = convertToTitleCase(raw[i][24]);

        // Billing Phone Number
        let billingPhoneNumber = formatPhoneNumber(raw[i][33]);
        row.billingPhoneNumber = billingPhoneNumber;

        // Province
        row.province = getProvince(raw[i][41]);

        // City
        row.city =raw[i][39];

        // Address
        row.address = raw[i][35];

        // Shipping Fee
        let cod = isPaid ? "0" : raw[i][9];
        row.shippingFee = cod;

        // Email Address
        row.email = raw[i][1];

        // Payment Method
        row.paymentMode = raw[i][47];

        // Shipping Phone Number
        let shippingPhoneNumber = formatPhoneNumber(raw[i][43]);
        row.shippingPhoneNumber = shippingPhoneNumber;

        let rows = 1;
        let donation = 0;
        for (let j = 1; j < raw.length; j++) {
            if (raw[i + j] == null) {
                break;
            } else if (j > 0 && raw[i + j][13] != "") {
                break;
            } else if (raw[i + j][17] == 'Tip') {
                donation = raw[i + j][18];
            }

            rows++;
        }

        // Donation
        row.donation = donation;

        // Subtotal
        row.subtotal = raw[i][8];

        // Raw Province
        row.rawProvince = raw[i][41];

        // CHECK:

        // Wrong Phone Number
        if (billingPhoneNumber.length !== 11 || billingPhoneNumber.substring(0, 2) != '09') {
            wrongNumber.push(row);
            i += (rows - 1);
            continue;
        }

        // Other Payment Modes
        if (raw[i][47].toLowerCase().includes('custom')) {
            otherPaymentModes.push(row);
            i += (rows - 1);
            continue;
        }
        
        // Combined Orders
        let isRepeated = false;
        let repeatedIndex;

        data.forEach((it, index) => {
            if (it['billingPhoneNumber'] === row['billingPhoneNumber'] || (it['email'] != '' && row['email'] != '' && it['email'] === row['email'])) {
                isRepeated = true;
                repeatedIndex = index;
            }
        });

        if (isRepeated) {
            let existingRow = repeatedCustomers.find(order => order.repeatedIndex === repeatedIndex);
            
            if (existingRow != null) {
                existingRow.orders.push(row);
            } else {
                let newRow = {};
                newRow.repeatedIndex = repeatedIndex;
                newRow.orders = [data[repeatedIndex], row];
                repeatedCustomers.push(newRow);
                existingRow = repeatedCustomers.find(order => order.repeatedIndex === repeatedIndex);
            }

            // Free Shipping Error
            if (!isPaid) {
                let totalSubTotal = 0;
                let hasShippingFee = false;
                let firstOrder = existingRow.orders[0];
                existingRow.orders.forEach(order => {
                    totalSubTotal += order['subtotal'];
                    if (!hasShippingFee && order['shippingFee'] > 0) {
                        hasShippingFee = true;
                    }
                });
    
                if (totalSubTotal >= 999 && hasShippingFee) {
                    let existingFreeShipping = freeShipping.find(order => order['orderNumber'] == firstOrder['orderNumber']);
    
                    if (existingFreeShipping == null) {
                        freeShipping.push(firstOrder);
                    }
                }
            }

            i += (rows - 1);
            continue;
        }

        // Free Shipping Error
        if (!isPaid && raw[i][8] >= 999 && raw[i][9] > 0) {
            let existingFreeShipping = freeShipping.find(order => order[0] == orderNumber);

            if (existingFreeShipping == null) {
                freeShipping.push(row);
            }
        }

        // Different Billing & Shipping Details
        if (row['billingPhoneNumber'] != row['shippingPhoneNumber']) {
            billingShipping.push(row);
        }

        // Normal
        data.push(row);
        i += (rows - 1);
    }

    // Wrong Shipping Fee
    data.forEach(it => {
        if (it['shippingFee'] > 0 && it['subtotal'] < 999 && !checkShippingFee(it['rawProvince'], it['shippingFee'])) {
            wrongShippingFee.push(it);

            data = data.filter(item => {
                return item !== it;
            });
        }
    });

    smsData = data;
    smsDataRepeatedCustomers = repeatedCustomers;
    smsDataOtherPaymentModes = otherPaymentModes;
    smsDataWrongNumber = wrongNumber;
    smsDataWrongShippingFee = wrongShippingFee;
    smsDataFreeShipping = freeShipping;
    smsDataBillingShipping = billingShipping;
}

function createJntTable() {
    let table = document.createElement('table');
    let tableHead = document.createElement('thead');
    let tableBody = document.createElement('tbody');

    let rowHead = document.createElement('tr');

    jntData[0].forEach((cellData, index) => {
        let cell = document.createElement('th');

        if ([5, 6, 7].includes(index)) {
            cell.classList = 'text-nowrap';
        }

        cell.appendChild(document.createTextNode(cellData));
        rowHead.appendChild(cell);
    });

    tableHead.appendChild(rowHead);

    let province;
    let city;

    jntData.sort((a, b) => a[0] - b[0]);

    jntData.forEach((it, index) => {
        if (index > 0) {
            it.unshift(index);
        }
    });

    jntData.forEach((rowData, index) => {
        if (index === 0) {
            return;
        }

        let row = document.createElement('tr');
        let currentIndex = index;

        rowData.forEach((cellData, columnIndex) => {
            let cell = document.createElement('td');
            
            if (columnIndex === 5) {
                let select = document.createElement('select');
                address.forEach(it => {
                    let option = document.createElement('option');
                    option.value = it.province;
                    option.innerHTML = it.province;
                    option.selected = cellData === it.province;
                    select.appendChild(option);
                });

                select.dataset.row = currentIndex;
                select.dataset.col = 4;
                select.setAttribute('onchange', 'onProvinceChange(' + currentIndex + ')');

                province = cellData;
                jntData[index][5] = select.value;
                cell.appendChild(select);
            } else if (columnIndex === 6) {
                let select = document.createElement('select');

                let selectedProvince = address.find(it => it.province == province);
                selectedProvince.cities.forEach(it => {
                    let option = document.createElement('option');
                    option.value = it.city;
                    option.innerHTML = it.city;
                    select.appendChild(option);
                });

                let matches = selectedProvince.cities;
                let terms = cellData.split(' ');

                terms.forEach(it => {
                    let term = it.toLowerCase();
                    if (!['city', 'of', 'municipality'].includes(term)) {
                        matches = matches.filter(cityItem => {
                            return cityItem.city.toLowerCase().includes(term);
                        });
                    }
                });

                if (matches.length > 0) {
                    select.value = matches[0].city;
                }

                select.dataset.row = currentIndex;
                select.dataset.col = 5;
                select.setAttribute('onchange', 'onCityChange(' + currentIndex + ')');

                city = select.value;
                jntData[index][6] = select.value;
                cell.appendChild(select);
            } else if (columnIndex === 7) {
                let select = document.createElement('select');

                let selectedProvince = address.find(it => it.province == province);
                let selectedCity = selectedProvince.cities.find(it => it.city == city);
                selectedCity.barangays.forEach(it => {
                    let option = document.createElement('option');
                    option.value = it;
                    option.innerHTML = it;
                    select.appendChild(option);
                });

                select.dataset.row = currentIndex;
                select.dataset.col = 6;
                select.setAttribute('onchange', 'onBarangayChange(' + currentIndex + ')');

                jntData[index][7] = select.value;
                cell.appendChild(select);
            } else {
                cell.appendChild(document.createTextNode(cellData));
            }

            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    table.appendChild(tableHead);
    table.appendChild(tableBody);
    table.classList.add('table');
    table.classList.add('table-striped');

    let header = document.createElement('h4');
    header.innerHTML = 'Orders for Booking';

    let badge = document.createElement('button');
    badge.classList = 'btn btn-secondary btn-sm';
    badge.disabled = true;
    badge.innerHTML = (jntData.length - 1) + ((jntData.length - 1) > 1 ? ' orders' : ' order');

    let button = document.createElement('button');
    button.classList = 'btn btn-success';
    button.innerHTML = 'Export CSV';
    button.setAttribute('onclick', 'exportCsv()');

    let left = document.createElement('div');
    left.classList = 'd-flex gap-3 align-items-center';
    left.appendChild(header);
    left.appendChild(badge);

    let tableHeader = document.querySelector('.main-table .table-header');
    tableHeader.appendChild(left);
    tableHeader.appendChild(button);

    let tableContent = document.querySelector('.main-table .table-body');
    tableContent.appendChild(table);

    $('select').select2();

    $('select').on('select2:open', function (e) {
        document.querySelector('.select2-search__field').focus();
    });

    $('select').on('select2:close', function (e) {
        if ($(this).attr("data-col") < 6) {
            $('select[data-row="' + $(this).attr("data-row") + '"][data-col="' + (parseInt($(this).attr("data-col")) + 1) + '"]').select2('open');
        }
    });
}

function createSmsTable() {
    let columns = ['index', 'orderNumber', 'name', 'billingPhoneNumber', 'province', 'city', 'address', 'shippingFee', 'donation', 'subtotal', 'action'];

    let table = document.createElement('table');
    let tableHead = document.createElement('thead');
    let tableBody = document.createElement('tbody');

    let rowHead = document.createElement('tr');

    columns.forEach(column => {
        let cell = document.createElement('th');
        cell.classList = 'text-nowrap';
        cell.appendChild(document.createTextNode(getColumnName(column)));
        rowHead.appendChild(cell);
    });

    tableHead.appendChild(rowHead);

    let data = JSON.parse(JSON.stringify(smsData));

    data.forEach((it, index) => {
        it['index'] = index + 1;
    });

    data.forEach(rowData => {
        let row = document.createElement('tr');

        columns.forEach(column => {
            let cell = document.createElement('td');

            if (rowData[column] == null) {
                return;
            }

            if (column === 'shippingFee' && rowData[column] === '0') {
                let paidText = document.createElement('span');
                paidText.classList = 'text-secondary';
                paidText.innerHTML = 'Paid';
                cell.appendChild(paidText);
            } else {
                cell.appendChild(document.createTextNode(rowData[column]));
            }

            row.appendChild(cell);
        });

        let actionCell = document.createElement('td');

        let buttonContainer = document.createElement('div');
        buttonContainer.classList = 'd-flex gap-3';
        
        let removeButton =  document.createElement('button');
        removeButton.classList = 'btn btn-warning';
        removeButton.innerHTML = 'x';
        removeButton.setAttribute('onclick', 'removeOrder(' + rowData['orderNumber'] + ')');

        let deleteButton =  document.createElement('button');
        deleteButton.classList = 'btn btn-danger';
        deleteButton.innerHTML = '-';
        deleteButton.setAttribute('onclick', 'deleteOrder(' + rowData['orderNumber'] + ')');

        buttonContainer.appendChild(removeButton);
        buttonContainer.appendChild(deleteButton);
        
        actionCell.appendChild(buttonContainer);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });

    table.appendChild(tableHead);
    table.appendChild(tableBody);
    table.classList.add('table');
    table.classList.add('table-striped');

    let header = document.createElement('h4');
    header.innerHTML = 'Orders for Confirmation';

    let badge = document.createElement('button');
    badge.classList = 'btn btn-secondary btn-sm';
    badge.disabled = true;
    badge.innerHTML = (data.length) + ((data.length) > 1 ? ' orders' : ' order');

    let button = document.createElement('button');
    button.classList = 'btn btn-success';
    button.innerHTML = 'Export TXT';
    button.setAttribute('onclick', 'exportTxt()');

    let left = document.createElement('div');
    left.classList = 'd-flex gap-3 align-items-center';
    left.appendChild(header);
    left.appendChild(badge);

    let tableHeader = document.querySelector('.main-table .table-header');
    tableHeader.appendChild(left);
    tableHeader.appendChild(button);

    let tableContent = document.querySelector('.main-table .table-body');
    tableContent.appendChild(table);
}

function createSmsTableOthers(type) {
    let table = document.createElement('table');
    let tableHead = document.createElement('thead');
    let tableBody = document.createElement('tbody');

    let rowHead = document.createElement('tr');

    let data;
    let title;
    let columns;

    switch(type) {
        case 'repeated-customers':
            data = JSON.parse(JSON.stringify(smsDataRepeatedCustomers));
            title = 'Combined Orders';
            columns = ['index', 'orderNumber', 'name', 'billingPhoneNumber', 'donation'];
            break;
        case 'free-shipping':
            data = JSON.parse(JSON.stringify(smsDataFreeShipping));
            title = 'Free Shipping Error';
            columns = ['index', 'orderNumber', 'name', 'billingPhoneNumber', 'shippingFee', 'donation', 'subtotal'];
            break;
        case 'wrong-shipping-fee':
            data = JSON.parse(JSON.stringify(smsDataWrongShippingFee));
            title = 'Incorrect Shipping Fee';
            columns = ['index', 'orderNumber', 'name', 'billingPhoneNumber', 'province', 'city', 'address', 'shippingFee', 'donation', 'action'];
            break;
        case 'wrong-number':
            data = JSON.parse(JSON.stringify(smsDataWrongNumber));
            title = 'Invalid Phone Number';
            columns = ['index', 'orderNumber', 'name', 'billingPhoneNumber', 'donation'];
            break;
        case 'billing-shipping':
            data = JSON.parse(JSON.stringify(smsDataBillingShipping));
            title = 'Different Billing & Shipping Details';
            columns = ['index', 'orderNumber', 'name', 'billingPhoneNumber', 'donation'];
            break;
        case 'other-payment-modes':
            data = JSON.parse(JSON.stringify(smsDataOtherPaymentModes));
            title = 'Other Payment Modes';
            columns = ['index', 'orderNumber', 'name', 'billingPhoneNumber', 'donation', 'paymentMode'];
            break;
    }

    columns.forEach(column => {
        let cell = document.createElement('th');
        cell.classList = 'text-nowrap';
        cell.appendChild(document.createTextNode(getColumnName(column)));
        rowHead.appendChild(cell);
    });

    tableHead.appendChild(rowHead);

    data.forEach((it, index) => {
        it.index = index + 1;
    });

    if (data.length > 0) {
        switch(type) {
            case 'repeated-customers':
            case 'free-shipping':
                let combinedColumns = ['orderNumber', 'shippingFee', 'subtotal'];

                data.forEach(rowData => {
                    let row = document.createElement('tr');
                        
                    if (type === 'free-shipping') {
                        let combinedOrders = smsDataRepeatedCustomers.find(it => {
                            return it.orders[0]['orderNumber'] == rowData['orderNumber'];
                        });
                        if (combinedOrders != null) {
                            rowData = {
                                orders: combinedOrders.orders,
                                index: rowData.index
                            };
                        } else {
                            rowData = {
                                orders: [rowData],
                                index: rowData.index
                            };
                        }
                    }
        
                    columns.forEach(column => {
                        let value = '';

                        if (rowData[column] != null) {
                            value = rowData[column];
                        } else if (combinedColumns.includes(column)) {
                            value = '';

                            rowData.orders.forEach((order, orderIndex) => {
                                value += (orderIndex === 0 ? '' : ', ') + order[column];
                            });
                        } else {
                            value = rowData.orders[0][column];
                        }
        
                        let cell = document.createElement('td');
                        cell.appendChild(document.createTextNode(value));
                        row.appendChild(cell);
                    });
            
                    tableBody.appendChild(row);
                });
                break;
            default:
                data.forEach(rowData => {
                    let row = document.createElement('tr');
            
                    columns.forEach(column => {
                        let cell = document.createElement('td');
            
                        if (column === 'shippingFee' && rowData[column] === '0') {
                            let paidText = document.createElement('span');
                            paidText.classList = 'text-secondary';
                            paidText.innerHTML = 'Paid';
                            cell.appendChild(paidText);
                        } else if (column === 'action') {
                            let removeButton =  document.createElement('button');
                            removeButton.classList = 'btn btn-success';
                            removeButton.innerHTML = '+';
                            removeButton.setAttribute('onclick', 'addOrder(' + rowData['orderNumber'] + ')');
                            cell.appendChild(removeButton);
                        } else {
                            cell.appendChild(document.createTextNode(rowData[column]));
                        }
            
                        row.appendChild(cell);
                    });
            
                    tableBody.appendChild(row);
                });
        }
    } else {
        let row = document.createElement('tr');
        let cell = document.createElement('td');
        cell.setAttribute('colspan', columns.length);
        cell.appendChild(document.createTextNode('No rows found.'));
        row.appendChild(cell);

        tableBody.appendChild(row);
    }

    table.appendChild(tableHead);
    table.appendChild(tableBody);
    table.classList.add('table');
    table.classList.add('table-striped');

    let tableHeader = document.querySelector('.' + type + ' .table-header');
    tableHeader.classList.add('mt-3');

    let left = document.createElement('div');
    left.classList = 'd-flex gap-3 align-items-center';

    let header = document.createElement('h4');
    header.innerHTML = title;
    left.appendChild(header);

    if (data.length > 0) {
        let badge = document.createElement('button');
        badge.classList = 'btn btn-secondary btn-sm';
        badge.disabled = true;
        if (type === 'repeated-customers') {
            badge.innerHTML = (data.length) + ((data.length) > 1 ? ' customers' : ' customer');
        } else {
            badge.innerHTML = (data.length) + ((data.length) > 1 ? ' orders' : ' order');
        }
        left.appendChild(badge);
    }
    tableHeader.appendChild(left);

    let tableContent = document.querySelector('.' + type + ' .table-body');
    tableContent.appendChild(table);
}

function getColumnName(column) {
    switch (column) {
        case 'index': return '#';
        case 'orderNumber': return 'Order #';
        case 'name': return 'Name'
        case 'billingPhoneNumber': return 'Phone #';
        case 'province': return 'Province';
        case 'city': return 'City';
        case 'address': return 'Address';
        case 'shippingFee': return 'Shipping Fee';
        case 'donation': return 'Donation';
        case 'subtotal': return 'Subtotal';
        case 'action': return 'Action';
        case 'paymentMode': return 'Payment Mode';
    }
}

function removeOrder(orderNumber) {
    let removedOrder = smsData.find(it => it['orderNumber'] == orderNumber);
    smsDataWrongShippingFee.push(removedOrder);

    let index = smsData.indexOf(removedOrder);
    smsData.splice(index, 1);

    document.querySelector('.main-table .table-header').innerHTML = '';
    document.querySelector('.main-table .table-body').innerHTML = '';

    document.querySelector('.wrong-shipping-fee .table-header').innerHTML = '';
    document.querySelector('.wrong-shipping-fee .table-body').innerHTML = '';

    createSmsTable();
    createSmsTableOthers('wrong-shipping-fee');
}

function deleteOrder(orderNumber) {
    let deletedOrder = smsData.find(it => it['orderNumber'] == orderNumber);
    let index = smsData.indexOf(deletedOrder);
    smsData.splice(index, 1);

    document.querySelector('.main-table .table-header').innerHTML = '';
    document.querySelector('.main-table .table-body').innerHTML = '';

    createSmsTable();
}

function addOrder(orderNumber) {
    let removedOrder = smsDataWrongShippingFee.find(it => it['orderNumber'] == orderNumber);
    smsData.push(removedOrder);
    smsData.sort((a, b) => a['orderNumber'].localeCompare(b['orderNumber']));

    let index = smsDataWrongShippingFee.indexOf(removedOrder);
    smsDataWrongShippingFee.splice(index, 1);

    document.querySelector('.main-table .table-header').innerHTML = '';
    document.querySelector('.main-table .table-body').innerHTML = '';

    document.querySelector('.wrong-shipping-fee .table-header').innerHTML = '';
    document.querySelector('.wrong-shipping-fee .table-body').innerHTML = '';

    createSmsTable();
    createSmsTableOthers('wrong-shipping-fee');
}

function onProvinceChange(index) {
    let provinceSelect = document.querySelector('[data-row="' + index + '"][data-col="4"]');
    let citySelect = document.querySelector('[data-row="' + index + '"][data-col="5"]');
    let barangaySelect = document.querySelector('[data-row="' + index + '"][data-col="6"]');

    citySelect.innerHTML = "";
    barangaySelect.innerHTML = "";

    let selectedProvince = address.find(it => it.province == provinceSelect.value);
    selectedProvince.cities.forEach(it => {
        let option = document.createElement('option');
        option.value = it.city;
        option.innerHTML = it.city;
        citySelect.appendChild(option);
    });

    let selectedCity = selectedProvince.cities.find(it => it.city == citySelect.value);
    selectedCity.barangays.forEach(it => {
        let option = document.createElement('option');
        option.value = it;
        option.innerHTML = it;
        barangaySelect.appendChild(option);
    });

    jntData[index][5] = provinceSelect.value;
    jntData[index][6] = citySelect.value;
    jntData[index][7] = barangaySelect.value;
}

function onCityChange(index) {
    let provinceSelect = document.querySelector('[data-row="' + index + '"][data-col="4"]');
    let citySelect = document.querySelector('[data-row="' + index + '"][data-col="5"]');
    let barangaySelect = document.querySelector('[data-row="' + index + '"][data-col="6"]');

    barangaySelect.innerHTML = "";

    let selectedProvince = address.find(it => it.province == provinceSelect.value);
    let selectedCity = selectedProvince.cities.find(it => it.city == citySelect.value);
    selectedCity.barangays.forEach(it => {
        let option = document.createElement('option');
        option.value = it;
        option.innerHTML = it;
        barangaySelect.appendChild(option);
    });

    jntData[index][6] = citySelect.value;
    jntData[index][7] = barangaySelect.value;
}

function onBarangayChange(index) {
    let barangaySelect = document.querySelector('[data-row="' + index + '"][data-col="6"]');
    jntData[index][7] = barangaySelect.value;
}

function exportCsv() {
    let processRow = function (row) {
        let finalVal = '';
        for (let j = 0; j < row.length; j++) {
            let innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            let result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    let csvFile = '';
    for (let i = 0; i < jntData.length; i++) {
        csvFile += processRow(jntData[i]);
    }

    let fileName = new Date().toDateString().substring(4, 10) + ' - Orders.csv';

    let blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        let link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            let url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

function exportTxt() {
    let processRow = function (row) {
        let finalVal = '';
        let columns = ['name', 'billingPhoneNumber'];
        columns.forEach((column, index) => {
            let value = row[column];

            if (column === 'name') {
                let names = row[column].split(' ');
                value = names[0].toLowerCase() === 'ma.' || names[0].toLowerCase() === 'ma' ? (names[1] ?? names[0]) : names[0]; 
            }

            let innerValue = value === null ? '' : value.toString();
            if (value instanceof Date) {
                innerValue = value.toLocaleString();
            };
            let result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (index > 0)
                finalVal += ',';
            finalVal += result;
        });
        return finalVal + '\n';
    };

    let txtFile = '';
    for (let i = 0; i < smsData.length; i++) {
        txtFile += processRow(smsData[i]);
    }

    let fileName = new Date().toDateString().substring(4, 10) + ' - Confirmation.txt';

    let blob = new Blob([txtFile], { type: 'octet/stream' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        let link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            let url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

function convertToTitleCase(str) {
    let name = str; 
    name = name.replace('(FB) ', '');
    name = name.replace('(IG) ', '');
    name = name.replace('(GRAB) ', '');

    let splitStr = name.toLowerCase().split(' ');
    for (let i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }

    return splitStr.join(' '); 
}

function formatPhoneNumber(str) {
    let number = str;
    number = number.replace(/\D/g, '');

    if (number.startsWith("9", 0)) {
        number = '0' + number;
    }

    if (number.startsWith("63", 0)) {
        number = '0' + number.substring(2);
    }

    return number;
}

function updateButtons() {
    if(document.getElementById("file").value === "") { 
        document.getElementById('jntButton').disabled = true; 
        document.getElementById('smsButton').disabled = true; 
    } else {
        document.getElementById('jntButton').disabled = false;
        document.getElementById('smsButton').disabled = false;
    }
}

function getProvince(str) {
    switch(str) {
        case 'PH-ABR': return 'ABRA'; break;
        case 'PH-AGN': return 'AGUSAN-DEL-NORTE'; break;
        case 'PH-AGS': return 'AGUSAN-DEL-SUR'; break;
        case 'PH-AKL': return 'AKLAN'; break;
        case 'PH-ALB': return 'ALBAY'; break;
        case 'PH-ANT': return 'ANTIQUE'; break;
        case 'PH-APA': return 'APAYAO'; break;
        case 'PH-AUR': return 'AURORA'; break;
        case 'PH-BAS': return 'BASILAN'; break;
        case 'PH-BAN': return 'BATAAN'; break;
        case 'PH-BTN': return 'BATANES'; break;
        case 'PH-BTG': return 'BATANGAS'; break;
        case 'PH-BEN': return 'BENGUET'; break;
        case 'PH-BIL': return 'BILIRAN'; break;
        case 'PH-BOH': return 'BOHOL'; break;
        case 'PH-BUK': return 'BUKIDNON'; break;
        case 'PH-BUL': return 'BULACAN'; break;
        case 'PH-CAG': return 'CAGAYAN'; break;
        case 'PH-CAN': return 'CAMARINES-NORTE'; break;
        case 'PH-CAS': return 'CAMARINES-SUR'; break;
        case 'PH-CAM': return 'CAMIGUIN'; break;
        case 'PH-CAP': return 'CAPIZ'; break;
        case 'PH-CAT': return 'CATANDUANES'; break;
        case 'PH-CAV': return 'CAVITE'; break;
        case 'PH-CEB': return 'CEBU'; break;
        case 'PH-NCO': return 'COTABATO'; break;
        case 'PH-COM': return 'COMPOSTELA-VALLEY'; break;
        case 'PH-DAV': return 'DAVAO-DEL-NORTE'; break;
        case 'PH-DAS': return 'DAVAO-DEL-SUR'; break;
        case 'PH-DVO': return 'DAVAO-DEL-SUR'; break;
        case 'PH-DAO': return 'DAVAO-ORIENTAL'; break;
        case 'PH-DIN': return 'DINAGAT-ISLANDS'; break;
        case 'PH-EAS': return 'EASTERN-SAMAR'; break;
        case 'PH-GUI': return 'GUIMARAS'; break;
        case 'PH-IFU': return 'IFUGAO'; break;
        case 'PH-ILN': return 'ILOCOS-NORTE'; break;
        case 'PH-ILS': return 'ILOCOS-SUR'; break;
        case 'PH-ILI': return 'ILOILO'; break;
        case 'PH-ISA': return 'ISABELA'; break;
        case 'PH-KAL': return 'KALINGA'; break;
        case 'PH-LUN': return 'LA-UNION'; break;
        case 'PH-LAG': return 'LAGUNA'; break;
        case 'PH-LAN': return 'LANAO-DEL-NORTE'; break;
        case 'PH-LAS': return 'LANAO-DEL-SUR'; break;
        case 'PH-LEY': return 'LEYTE'; break;
        case 'PH-MAG': return 'MAGUINDANAO'; break;
        case 'PH-MAD': return 'MARINDUQUE'; break;
        case 'PH-MAS': return 'MASBATE'; break;
        case 'PH-00': return 'METRO-MANILA'; break;
        case 'PH-MSC': return 'MISAMIS-OCCIDENTAL'; break;
        case 'PH-MSR': return 'MISAMIS-ORIENTAL'; break;
        case 'PH-MOU': return 'MOUNTAIN-PROVINCE'; break;
        case 'PH-NEC': return 'NEGROS-OCCIDENTAL'; break;
        case 'PH-NER': return 'NEGROS-ORIENTAL'; break;
        case 'PH-NSA': return 'NORTHERN-SAMAR'; break;
        case 'PH-NUE': return 'NUEVA-ECIJA'; break;
        case 'PH-NUV': return 'NUEVA-VIZCAYA'; break;
        case 'PH-MDC': return 'OCCIDENTAL-MINDORO'; break;
        case 'PH-MDR': return 'ORIENTAL-MINDORO'; break;
        case 'PH-PLW': return 'PALAWAN'; break;
        case 'PH-PAM': return 'PAMPANGA'; break;
        case 'PH-PAN': return 'PANGASINAN'; break;
        case 'PH-QUE': return 'QUEZON'; break;
        case 'PH-QUI': return 'QUIRINO'; break;
        case 'PH-RIZ': return 'RIZAL'; break;
        case 'PH-ROM': return 'ROMBLON'; break;
        case 'PH-WSA': return 'WESTERN-SAMAR'; break;
        case 'PH-SAR': return 'SARANGANI'; break;
        case 'PH-SIG': return 'SIQUIJOR'; break;
        case 'PH-SOR': return 'SORSOGON'; break;
        case 'PH-SCO': return 'SOUTH-COTABATO'; break;
        case 'PH-SLE': return 'SOUTHERN-LEYTE'; break;
        case 'PH-SUK': return 'SULTAN-KUDARAT'; break;
        case 'PH-SLU': return 'SULU'; break;
        case 'PH-SUN': return 'SURIGAO-DEL-NORTE'; break;
        case 'PH-SUR': return 'SURIGAO-DEL-SUR'; break;
        case 'PH-TAR': return 'TARLAC'; break;
        case 'PH-TAW': return 'TAWI-TAWI'; break;
        case 'PH-ZMB': return 'ZAMBALES'; break;
        case 'PH-ZAN': return 'ZAMBOANGA-DEL-NORTE'; break;
        case 'PH-ZAS': return 'ZAMBOANGA-DEL-SUR'; break;
        case 'PH-ZSI': return 'ZAMBOANGA-SIBUGAY'; break;
        default: return '';
    }
}

function checkShippingFee(province, shippingFee) {
    let correctShippingFee;

    if (shippingFeeLow.includes(province)) {
        correctShippingFee = 79;
    } else if (shippingFeeMid.includes(province)) {
        correctShippingFee = 89;
    } else if (shippingFeeHigh.includes(province)) {
        correctShippingFee = 99;
    } else {
        correctShippingFee = 100;
    }

    return correctShippingFee == shippingFee;
}

function initializeAddress() {
    $.ajax({
        type: "GET",  
        url: "address.csv",
        dataType: "text",       
        success: response => {
            let arr = $.csv.toArrays(response);
            let temp = [];

            for (let i = 0; i < arr.length; i++) {
                if (arr[i] == null) {
                    break;
                }

                let rows = 0;
                let obj = {
                    province: arr[i][0],
                    cities: [],
                }

                let cityRows = 0;
                for (let j = 0; j < arr.length; j++) {
                    if (arr[i + j] == null) {
                        break;
                    } else if (arr[i + j][0] == arr[i][0]) {
                        cityRows++;
                        let city = {
                            city: arr[i + j][1],
                            barangays: [],
                        }

                        let barangayRows = 0;
                        for (let k = 0; k < arr.length; k++) {
                            if (arr[i + j + k] == null) {
                                break;
                            } else if (arr[i + j + k][1] == arr[i + j][1]) {
                                rows++;
                                barangayRows++;
                                city.barangays.push(arr[i + j + k][2]);                           
                            } else {
                                break;
                            }
                        }

                        obj.cities.push(city);
                        j += barangayRows - 1;
                    } else {
                        break;
                    }
                }

                temp.push(obj);
                i += rows - 1;
            }

            address = temp;
        }   
    });
}

let shippingFeeLow = [
    'PH-RIZ', 'PH-00',
];

let shippingFeeMid = [
    'PH-ABR', 'PH-ALB', 'PH-APA', 'PH-AUR', 'PH-BAN', 'PH-BTG', 'PH-BEN', 'PH-BUL', 'PH-CAG', 'PH-CAN', 'PH-CAS', 'PH-CAT', 'PH-CAV', 'PH-IFU', 'PH-ILN', 'PH-ILS', 'PH-ISA', 'PH-KAL', 'PH-LUN', 'PH-LAG', 'PH-MAD', 'PH-MAS', 'PH-MOU', 'PH-NUE', 'PH-NUV', 'PH-MDC', 'PH-MDR', 'PH-PAM', 'PH-PAN', 'PH-QUE', 'PH-QUI', 'PH-ROM', 'PH-SOR', 'PH-TAR', 'PH-ZMB'
];

let shippingFeeHigh = [
    'PH-AGN', 'PH-AGS', 'PH-AKL', 'PH-ANT', 'PH-BAS', 'PH-BIL', 'PH-BOH', 'PH-BUK', 'PH-CAM', 'PH-CAP', 'PH-CEB', 'PH-NCO', 'PH-COM', 'PH-DAV', 'PH-DAS', 'PH-DVO', 'PH-DAO', 'PH-DIN', 'PH-EAS', 'PH-GUI', 'PH-ILI', 'PH-LAN', 'PH-LAS', 'PH-LEY', 'PH-MAG', 'PH-MSC', 'PH-MSR', 'PH-NEC', 'PH-NER', 'PH-NSA', 'PH-PLW', 'PH-WSA', 'PH-SAR', 'PH-SIG', 'PH-SCO', 'PH-SLE', 'PH-SUK', 'PH-SLU', 'PH-SUN', 'PH-SUR', 'PH-TAW', 'PH-ZAN', 'PH-ZAS', 'PH-ZSI'
];