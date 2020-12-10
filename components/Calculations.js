import React, { useState } from 'react';
import axios from 'axios';
import VendorCard from '../components/subcomponents/VendorCard';

const Calculations = ({ orders }) => {
  const [vendors, setVendors] = useState({ vendors: [] });
  const [download, setDownload] = useState(false);
  const [generalCSV, setGeneralCSV] = useState(null);

  function sanitiseData(orders) {
    const soldItems = [];
    let currentOrder = {};
    orders.map((order, index) => {
      if (order.id) {
        currentOrder = order;
        orders[index + 1].shipping = order.totalShippingPriceSet.shopMoney.amount;
        return;
      }
      order.orderNr = currentOrder.name;
      order.orderPlacedAt = currentOrder.createdAt;
      order.orderFullfillment = currentOrder.fulfillments[0].status;
      soldItems.push(order);
    });
    return soldItems;
  }
  function filterAndGroupVendors(clearData) {
    let vendors = {};
    let shippingFees = {
      name: 'Shipping',
      grossSale: 0,
      amountToBePaid: 0,
      soldItems: [],
    };

    clearData.forEach((e) => {
      const order = e.orderNr;
      const vendorModal = {
        name: e.vendor,
        soldItems: [],
        itemCount: 0,
        grossSale: 0,
        amountToBePaid: 0,
      };
      if (e.orderFullfillment === 'SUCCESS' && e.shipping) {
        shippingFees.soldItems.push({
          orderNr: order,
          price: Number(e.shipping),
          quantity: 1,
          orderPlacedAt: e.orderDate,
        });
      }
      if (e.fulfillmentStatus === 'fulfilled') {
        if (e.vendor) {
          if (!vendors[e.vendor]) {
            vendors[e.vendor] = vendorModal;
          }
          vendors[e.vendor].soldItems.push({
            name: e.title,
            price: e.discountedUnitPriceSet.shopMoney.amount,
            quantity: e.quantity,
            orderNr: e.orderNr,
            orderPlacedAt: e.orderPlacedAt,
          });
        }
      } else if (e.name === 'Tip') {
        if (!vendors.Tip) {
          vendors.Tip = { ...vendorModal, name: 'Tip' };
        }
        vendors.Tip.soldItems.push({
          name: e.name,
          price: e.price,
          quantity: e.quantity,
          orderNr: e.orderNr,
        });
      }
    });
    vendors.Shipping = shippingFees;
    return vendors;
  }

  function getFormattedDate(fullDate) {
    var date = new Date(fullDate);
    var dd = date.getDate();

    var mm = date.getMonth() + 1;
    var yyyy = date.getFullYear();
    if (dd < 10) {
      dd = '0' + dd;
    }

    if (mm < 10) {
      mm = '0' + mm;
    }

    date = mm + '-' + dd + '-' + yyyy;
    return date;
  }

  function takePercentage(amount, percentage) {
    return Number(((amount / 100) * percentage).toFixed(2));
  }
  function roundNumber(num) {
    return Number(num.toFixed(2));
  }

  function calculateTotals(vendors) {
    let totalGross = 0;
    let totalToPay = 0;
    for (let vendor in vendors) {
      let totalSold = 0;

      vendors[vendor].soldItems.forEach((i) => {
        let amount = i.price * i.quantity;
        vendors[vendor].itemCount += i.quantity;
        totalSold += amount;
        vendors[vendor].grossSale += amount;
        if (i.orderPlacedAt) {
          i.orderPlacedAt = i.orderPlacedAt.slice(0, 10);
        }
        if (vendor !== 'Tip Jar' && vendor !== 'Tip') {
          vendors[vendor].amountToBePaid += amount;
        }
      });
      vendors[vendor].grossSale = roundNumber(vendors[vendor].grossSale);
      vendors[vendor].amountToBePaid = roundNumber(vendors[vendor].amountToBePaid);
      vendors[vendor].soldItems.push({
        name: 'TOTAL',
        price: roundNumber(totalSold),
      });

      if (vendor !== 'Tip Jar') {
        totalToPay += vendors[vendor].amountToBePaid;
      }
      totalGross += vendors[vendor].grossSale;
    }
    vendors.totalGross = roundNumber(totalGross);

    vendors.totalToPay = roundNumber(totalToPay);

    return vendors;
  }

  async function getCsvFile(dataArray, name) {
    const res = await axios.post(`${baseUrl}/upload`, {
      dataArray,
      name,
    });
    if (res.data === 'it is ok') {
      setDownload({ name, url: `${baseUrl}/${name}.csv` });
    }
  }

  async function getGeneralCsvFile(dataArray) {
    let name;
    let startDate = getFormattedDate(dataArray[0].soldItems[0].orderPlacedAt);
    let endDate = getFormattedDate(dataArray[0].soldItems[0].orderPlacedAt);
    const newArr = dataArray.map((vendor) => {
      if (vendor.soldItems) {
        vendor.soldItems.forEach((item) => {
          if (item.quantity) {
            if (getFormattedDate(item.orderPlacedAt) > endDate) {
              if (item.orderPlacedAt !== undefined) {
                endDate = getFormattedDate(item.orderPlacedAt);
              }
            } else if (getFormattedDate(item.orderPlacedAt) < startDate) {
              startDate = getFormattedDate(item.orderPlacedAt);
            }
          }
        });
        name = `${startDate.replace(/\//g, '')}-${endDate.replace(/\//g, '')}generalCSV`;
        return {
          name: vendor.name,
          period: `${startDate}-${endDate}`,
          'Total Quantity': vendor.itemCount,
          'Gross Sale': vendor.grossSale,
          Payout: vendor.amountToBePaid,
        };
      } else {
        console.log('this is a problem with general csv preparing function');
        return null;
      }
    });
    setGeneralCSV(name);

    getCsvFile(newArr, name);
  }
  function onShowClick() {
    if (orders[0]) {
      const clearData = sanitiseData(orders);
      let vendors = filterAndGroupVendors(clearData);
      vendors = calculateTotals(vendors);
      const vendorsArr = [];
      for (let i in vendors) {
        if (i !== 'totalGross' && i !== 'totalToPay') {
          vendorsArr.push(vendors[i]);
        }
      }

      vendors = {
        vendors: vendorsArr,
        totalGross: vendors.totalGross,
        totalToPay: vendors.totalToPay,
      };
      setVendors(vendors);
    }
  }
  return (
    <div>
      <div className='dropField'>
        <div className='upload-section'>
          <button onClick={onShowClick}>Show Results</button>

          <div className='date-input'>
            {vendors.vendors[0] &&
              (download.name !== generalCSV ? (
                <button className='top-margin' onClick={() => getGeneralCsvFile(vendors.vendors)}>
                  All Vendor Payouts CSV
                </button>
              ) : (
                <a href={download.url}>Download Csv</a>
              ))}
          </div>
        </div>
        <div className='vendor-card-container'>
          {vendors.vendors[0] &&
            vendors.vendors.map((v) => (
              <VendorCard key={v.name} v={v} getCsvFile={getCsvFile} download={download} />
            ))}
        </div>
      </div>
    </div>
  );
};
export default Calculations;
