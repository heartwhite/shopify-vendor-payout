import { useState } from 'react';
import gql from 'graphql-tag';
import { useLazyQuery, useMutation } from '@apollo/react-hooks';
import Calculations from '../components/Calculations';
import axios from 'axios';

const CHECK_BULK = gql`
  query {
    currentBulkOperation {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
  }
`;

function Orders() {
  const [orders, setOrders] = useState();
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();
  const [checkBulk, { loading, error, data, refetch }] = useLazyQuery(CHECK_BULK);
  const [fetchingFromBulkUrl, setFetchingFromBulkUrl] = useState(false);
  const [dateChange, setDateChange] = useState(true);
  const [isNewBulk, setIsNewBulk] = useState(false);

  const BULK_OP = gql`
  mutation {
    bulkOperationRunQuery(
      query: """
      {
        orders(first:500, query: "created_at:>${startDate}:00-0500 AND created_at:<${endDate}:00-0500") {
          edges {
            node {
              id
              name
              createdAt
              fulfillments{
                status
              }
              totalShippingPriceSet{
                shopMoney{
                  amount
                }
              }
              lineItems(first:50){
                edges{
                  node{
                    title
                    quantity
                    vendor
                    fulfillmentStatus
                    discountedUnitPriceSet{
                      shopMoney{
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      """
    ) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;
  const [bulkIt, { loading: bulkRequestLoading, data: bulkResponse }] = useMutation(BULK_OP);

  async function downloadUrl() {
    setFetchingFromBulkUrl(true);
    try {
      if (data.currentBulkOperation.status === 'COMPLETED') {
        const res = await axios.post(`${baseUrl}/api/orders`, {
          url: data.currentBulkOperation.url,
        });
        const dataString = res.data.trim().split('\n');
        const dataArray = JSON.parse('[' + dataString + ']');
        setFetchingFromBulkUrl(false);
        setOrders(dataArray);
      }
    } catch (error) {
      setFetchingFromBulkUrl(false);
    }
  }

  return (
    <div className='order-page'>
      <header className='App-header'>Vendors Payout</header>
      <div className='date-input'>
        <section>
          <label htmlFor='startDate'>
            <p>Start Date</p>
          </label>
          <input
            type='datetime-local'
            onChange={(e) => {
              setStartDate(e.target.value);
              setDateChange(true);
            }}
          />
        </section>
        <section>
          <label htmlFor='endDate'>End Date</label>
          <input
            type='datetime-local'
            onChange={(e) => {
              setEndDate(e.target.value);
              setDateChange(true);
            }}
          />
        </section>
        {dateChange && (
          <button
            className='submit'
            onClick={() => {
              bulkIt();
              setDateChange(false);
              setOrders(false);
              setIsNewBulk(true);
            }}
            disabled={!startDate || !endDate}
          >
            Prepare Orders
          </button>
        )}
      </div>
      {bulkRequestLoading && <p>loading</p>}
      {data && data.currentBulkOperation.status === 'COMPLETED'&&data.currentBulkOperation.url === null && !isNewBulk  ? <h2> no fulfilled orders between these dates </h2>: data && data.currentBulkOperation.status === 'COMPLETED' && !isNewBulk ? (
        orders?(
          <Calculations orders={orders} />
        ) : fetchingFromBulkUrl ? (
          <p>fetching</p>
        ) : (
          <div>
            Orders are ready in database<button onClick={downloadUrl}>Fetch Orders</button>
          </div>
        )
      ) : (
        bulkResponse && (
          <div>
            <p>Request created on database.</p>
            Waiting for query results
            {data &&
            (data.currentBulkOperation.status === 'RUNNING' ||
              data.currentBulkOperation.status === 'COMPLETED') ? (
              <button
                onClick={() => {
                  refetch();
                  setIsNewBulk(false);
                }}
              >
                {' '}
                Check Orders
              </button>
            ) : (
              <button
                onClick={() => {
                  checkBulk();
                  setIsNewBulk(false);
                }}
              >
                Check Orders
              </button>
            )}
            {loading ? (
              <p>... loading current operation</p>
            ) : (
              error && <p>... checking current operation is failed</p>
            )}
          </div>
        )
      )}
    </div>
  );
}
export default Orders;
