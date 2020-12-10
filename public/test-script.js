const header = $('header.site-header').parent();

const makeHeader = (data) => {
  header
    .prepend(`<div> ${data}</div>`)
    .css({ 'background-color': 'orange', 'text-align': 'center' });
};

fetch('https://702a5614db99.ngrok.io/api/products?shop=my-embedded-app-test.myshopify.com', {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
  },
})
  .then((res) => {
    console.log('res', res);
    res.text();
  })
  .then((data) => {
    console.log('data', data);
    makeHeader(`Hi thi is ${data} it`);
  })
  .catch((err) => console.log(err));
