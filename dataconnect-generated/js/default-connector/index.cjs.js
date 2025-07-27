const { getDataConnect, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'tuchonga',
  location: 'asia-south1'
};
exports.connectorConfig = connectorConfig;

