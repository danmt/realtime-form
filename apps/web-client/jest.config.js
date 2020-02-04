module.exports = {
  name: 'web-client',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/apps/web-client',
  snapshotSerializers: [
    'jest-preset-angular/AngularSnapshotSerializer.js',
    'jest-preset-angular/HTMLCommentSerializer.js'
  ]
};
