import { createSuiClient, isValidSuiAddress } from '../src/index';

describe('SuiClient Skill', () => {
  describe('createSuiClient', () => {
    it('should create client with default network', () => {
      const client = createSuiClient();
      expect(client).toBeDefined();
    });

    it('should create client with specified network', () => {
      const client = createSuiClient({ network: 'testnet' });
      expect(client).toBeDefined();
    });

    it('should create client with custom URL', () => {
      const client = createSuiClient({ customUrl: 'https://custom-rpc.com' });
      expect(client).toBeDefined();
    });
  });

  describe('isValidSuiAddress', () => {
    it('should validate correct Sui addresses', () => {
      const validAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
      expect(isValidSuiAddress(validAddress)).toBe(true);
    });

    it('should reject invalid Sui addresses', () => {
      const invalidAddresses = [
        '0x123', // Too short
        '0x000000000000000000000000000000000000000000000000000000000000000g', // Invalid character
        '0000000000000000000000000000000000000000000000000000000000000000', // Missing 0x prefix
        '' // Empty string
      ];

      invalidAddresses.forEach(address => {
        expect(isValidSuiAddress(address)).toBe(false);
      });
    });
  });
});