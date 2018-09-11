const CryptoJS = require("crypto-js");

class Block{
    constructor(index, hash, previousHash, timestamp, data){
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
    }
}

const genesisBlock = new Block(
    0,
    "46E0C4BD6C63BE160F662042E28D17D7B441187C7959D88C6B619C40D1188CAE",
    null,
    1536640032038,
    "This is the genesis!!"
);

let blockchain = [genesisBlock];

const getLastBlock = ()=> blockchain[blockchain.length -1];

const getTimeStamp = () => new Date().getTime() / 1000;

const getBlockchain = () => blockchain;

const createHash = (index, previousHash, timestamp, data) =>
    CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data)).toString();

const createNewBlock = data =>{
    const previousBlock = getLastBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimeStamp();
    const newHash = createHash(
        newBlockIndex, 
        previousBlock.hash, 
        newTimestamp, 
        data
    );

    const newBlock = new Block(
        newBlockIndex,
        newHash, 
        previousBlock.hash, 
        newTimestamp, 
        data
    );
    addBlockToChain(newBlock);
    return newBlock;
};

const getBlocksHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data);

const isNewBlockValid = (candidateBlock, latestBlock) =>{
    if(!isNewStructureValid(candidateBlock)){
        console,log('The candidate block structure is not valid');
        return false;
    }else if(latestBlock.index +1 !== candidateBlock.index){
        console,log('The candidate block doesnt hava a valid index');
        return false;
    }else if(latestBlock.hash !== candidateBlock.previousHash){
        console.log('The previousH?ash of the candidate block is not the hash of the latest block');
        return false;
    }else if(getBlocksHash(candidateBlock) !== candidateBlock.hash){
        console.log('The hash of this block is invalid');
        return false;
    }
    return true;
}

const isNewStructureValid = (block) =>{
    return (
        typeof block.index === 'number' && 
        typeof block.hash === "string" && 
        typeof block.previousHash === "string"&& 
        typeof block.timestamp === "number" &&
        typeof block.data === "string"
    );
}

const isChainValid = (candidateChain) =>{
    const isGenesisValid = block =>{
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    }
    if(!isGenesisValid(candidateChain[0])){
        console.log("The candidateChains's genesisBlock is not the same as our genesisBlock");
        return false;
    }
    for(let i=1; i < candidateChain.length; i++){
        if(!isNewBlockValid(candidateChain[i], candidateChain[i-1])){
            return false;
        }
    }
    return true;
}

const replaceChain = candidateChain =>{
    if(isChainValid(candidateChain) && candidateChain.length > getBlockchain().length){
        blockchain = candidateChain;
        return true;
    }else {
        return false;
    }
}

const addBlockToChain = candidateBlock =>{
    if(isNewBlockValid(candidateBlock, getLastBlock())){
        getBlockchain().push(candidateBlock);
        return true;
    }else{
        return false;
    }
}

module.exports ={
    getBlockchain,
    createNewBlock
}