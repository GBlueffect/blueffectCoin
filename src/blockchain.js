const CryptoJS = require("crypto-js");
const hexToBinary = require("hex-to-binary");

const BLOCK_GENERATION_INTERVAL = 10;
const DIFFICULTY_ADJUSTMENT_NTERVAL = 10;

/*
    // 블럭체인이 난이도를 조절하는 방법
    2016개마다 난이도를 조절하고 있고, 
    바로 근처에 생성된 블럭의 시간을 보고 조절하고 있다. 

    ** 산포도(reminder) 
    : 분산 및 표준편차. 대푯값 주위에 흩어져 있는 정도. 

*/
class Block{
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce){
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const genesisBlock = new Block(
    0, 
    "46E0C4BD6C63BE160F662042E28D17D7B441187C7959D88C6B619C40D1188CAE",
    null,
    1536640032038,
    "This is the genesis!!",
    0,
    0
);

let blockchain = [genesisBlock];

const getNewestBlock = ()=> blockchain[blockchain.length -1];

const getTimeStamp = () => Math.round(new Date().getTime() / 1000);

const getBlockchain = () => blockchain;

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) =>
    CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce).toString();

const createNewBlock = data =>{
    const previousBlock = getNewestBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimeStamp();
    const difficulty = findDifficulty();
    const newBlock = findBlock(
        newBlockIndex,
        previousBlock.hash, 
        newTimestamp, 
        data,
        difficulty
    );
    addBlockToChain(newBlock);
    require('./p2p').broadcastNewBlock();
    return newBlock;
};

const findDifficulty = ()=>{
    const newestBlock = getNewestBlock();
    if(newestBlock.index % DIFFICULTY_ADJUSTMENT_NTERVAL === 0 && newestBlock.index !== 0){
        //calculate new difficulty
        return calculateNewDifficulty(newestBlock, getBlockchain());
    }else{
        return newestBlock.difficulty;
    }
};

const calculateNewDifficulty = (newestBlock, blockchain)=>{
    const lastCalculateBlock = blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_NTERVAL];
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_NTERVAL;
    const timeTaken = newestBlock.timestamp - lastCalculateBlock.timestamp;

    if(timeTaken < timeExpected/2){
        return lastCalculateBlock.difficulty + 1;
    }else if(timeTaken > timeExpected*2){
        return lastCalculateBlock.difficulty -1;
    }else{
        return lastCalculateBlock.difficulty;
    }
};

const findBlock = (index, previousHash, timestamp, data, difficulty)=>{
    let nonce = 0;
    while(true){
        const hash = createHash(index, previousHash, timestamp, data, difficulty, nonce);
        // check amount of zeros(hashMachesDifficulty)
        if(hashMatchesDifficulty(hash, difficulty)){
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        
        nonce++;
    }
};

const hashMatchesDifficulty = (hash, difficulty)=>{
    const hashInBinary = hexToBinary(hash);
    const requiredZeros = "0".repeat(difficulty);
    console.log('Trying difficulty:', difficulty, ' with hash :', hash);
    return hashInBinary.startsWith(requiredZeros);
};

const getBlocksHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

const isTimeStampValid = (newBlock, oldBlock)=>{
    return (oldBlock.timestamp - 60 < newBlock.timestamp && newBlock.timestamp - 60 < getTimeStamp());
}

const isBlockValid = (candidateBlock, latestBlock) =>{
    if(!isBlockStructureValid(candidateBlock)){
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
    }else if(!isTimeStampValid(candidateBlock, latestBlock)){
        console.log('The timestamp of this block is invalid');
        return false;
    }
    return true;
}

const isBlockStructureValid = (block) =>{
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
        console.log(JSON.stringify(genesisBlock));
        console.log('candidateChain');
        console.log(JSON.stringify(candidateChain[0]));

        console.log("The candidateChains's genesisBlock is not the same as our genesisBlock");
        return false;
    }
    for(let i=1; i < candidateChain.length; i++){
        if(!isBlockValid(candidateChain[i], candidateChain[i-1])){
            return false;
        }
    }
    return true;
}

const sumDifficulty = anyBlockchain => 
    anyBlockchain
        .map(block => block.difficulty)
        .map(difficulty => Math.pow(2, difficulty))
        .reduce((a,b) => a + b);

const replaceChain = candidateChain =>{
    // 31. 강의 
    //if(isChainValid(candidateChain) && candidateChain.length > getBlockchain().length){
    if(isChainValid(candidateChain) && sumDifficulty(candidateChain) > sumDifficulty(getBlockchain())){
        blockchain = candidateChain;
        return true;
    }else {
        return false;
    }
}

const addBlockToChain = candidateBlock =>{
    if(isBlockValid(candidateBlock, getNewestBlock())){
        getBlockchain().push(candidateBlock);
        return true;
    }else{
        return false;
    }
}

module.exports ={
    getBlockchain,
    createNewBlock,
    getNewestBlock,
    isBlockStructureValid,
    addBlockToChain,
    replaceChain
}