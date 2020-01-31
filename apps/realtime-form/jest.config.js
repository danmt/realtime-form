module.exports = {
  name: 'realtime-form',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/apps/realtime-form',
  snapshotSerializers: [
    'jest-preset-angular/AngularSnapshotSerializer.js',
    'jest-preset-angular/HTMLCommentSerializer.js'
  ]
};
