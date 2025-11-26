declare module '@mysten/sui/client' {
  export interface SuiClientOptions {
    url: string;
  }

  export class SuiClient {
    constructor(options: SuiClientOptions);
    getBalance(params: { owner: string; coinType?: string }): Promise<any>;
    getCoins(params: { owner: string; coinType?: string }): Promise<any>;
    getAllCoins(params: { owner: string }): Promise<any>;
    getAllBalances(params: { owner: string }): Promise<any>;
    getObject(params: { id: string; options?: any }): Promise<any>;
    multiGetObjects(params: { ids: string[]; options?: any }): Promise<any>;
    getOwnedObjects(params: { owner: string; options?: any }): Promise<any>;
    getTransactionBlock(params: { digest: string; options?: any }): Promise<any>;
    queryTransactionBlocks(params: { filter: any; options?: any; limit?: number }): Promise<any>;
    waitForTransaction(params: { digest: string; options?: any }): Promise<any>;
    signAndExecuteTransaction(params: { transaction: any; signer: any; options?: any }): Promise<any>;
    executeTransactionBlock(params: { transactionBlock: Uint8Array; signature: string; options?: any }): Promise<any>;
    dryRunTransactionBlock(params: { transactionBlock: Uint8Array }): Promise<any>;
    devInspectTransactionBlock(params: { transactionBlock: Uint8Array; sender: string }): Promise<any>;
    getLatestSuiSystemState(): Promise<any>;
    getReferenceGasPrice(): Promise<number>;
    getProtocolConfig(): Promise<any>;
    getChainIdentifier(): Promise<string>;
    getLatestCheckpointSequenceNumber(): Promise<string>;
    getCheckpoint(params: { id: string }): Promise<any>;
    getCurrentEpoch(): Promise<any>;
    getEpochs(params: { cursor?: string; limit?: number }): Promise<any>;
    getNormalizedMoveModulesByPackage(params: { package: string }): Promise<any>;
    getNormalizedMoveModule(params: { package: string; module: string }): Promise<any>;
    getNormalizedMoveFunction(params: { package: string; module: string; function: string }): Promise<any>;
    getNormalizedMoveStruct(params: { package: string; module: string; struct: string }): Promise<any>;
    queryEvents(params: { query: any; limit?: number }): Promise<any>;
    getStakes(params: { owner: string }): Promise<any>;
    getStakesByIds(params: { stakedSuiIds: string[] }): Promise<any>;
    getDynamicFields(params: { parentId: string; limit?: number }): Promise<any>;
    getDynamicFieldObject(params: { parentId: string; name: any }): Promise<any>;
    resolveNameServiceAddress(params: { name: string }): Promise<string | null>;
    resolveNameServiceNames(params: { address: string }): Promise<string[]>;
    call(method: string, params: any[]): Promise<any>;
  }

  export function getFullnodeUrl(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'): string;
}

declare module '@mysten/sui/transactions' {
  export class Transaction {
    constructor();
    splitCoins(coin: any, amounts: any[]): any[];
    transferObjects(objects: any[], recipient: any): void;
    pure: {
      u64(value: number): any;
      address(value: string): any;
    };
    gas: any;
    object(id: string): any;
    build(params?: { client?: any }): Promise<Uint8Array>;
    sign(params: { client: any; signer: any }): Promise<{ bytes: Uint8Array; signature: string }>;
  }
}

declare module '@mysten/sui/keypairs/ed25519' {
  export class Ed25519Keypair {
    constructor();
    getPublicKey(): { toSuiAddress(): string };
  }
}