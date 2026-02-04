// Mock Scriptable's Color class for testing
class MockColor {
  constructor(hex) {
    this.hex = hex;
  }
  static dynamic(light, dark) {
    return light; // Return light mode color for testing
  }
  static black() {
    return new MockColor('#000000');
  }
  static white() {
    return new MockColor('#FFFFFF');
  }
  static gray() {
    return new MockColor('#808080');
  }
}

globalThis.Color = MockColor;
