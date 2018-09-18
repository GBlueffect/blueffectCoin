const WebSockets = require('ws'),
    Blockchain = require('./blockchain');

const { getNewestBlock, isBlockStructureValid,addBlockToChain,replaceChain, getBlockchain } = Blockchain;
const sockets = [];

// Message Types
const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

// Message Creators
const getLatest = ()=>{
    return{
        type: GET_LATEST,
        data: null
    };
};

const getALL = ()=>{
    return {
        type: GET_ALL,
        data: null
    };
};

const blockchainResponse = data =>{
    return{
        type:BLOCKCHAIN_RESPONSE,
        data
    };
};

const getSockets = ()=> sockets;

const startP2PServer = server =>{
    const wsServer = new WebSockets.Server({server});
    wsServer.on("connection", ws =>{
        console.log(`Hello~ Server`);
        initSocketConnection(ws);
    });
    console.log('BlueffectCoin P2P Server Running');
}

const initSocketConnection = ws =>{
    sockets.push(ws);
    handleSocketError(ws);
    handleSocketMessage(ws);
    sendMessage(ws, getLatest());
};

const parseData = data =>{
    try{
        return JSON.parse(data);
    }catch(e){
        console.log(e); 
        return null;
    }
}

const handleSocketMessage = ws=>{
    
    ws.on("message", data=>{
        const message = parseData(data);
        if(message === null){
            return;
        }

        switch(message.type){
            case GET_LATEST:
                sendMessage(ws, responseLatest());  
                break;
            case BLOCKCHAIN_RESPONSE:
                const receiveBlocks = message.data;
                if(receiveBlocks === null){
                    break;
                }
                handleBlockchainResponse(receiveBlocks);
                break;
            case GET_ALL:
                
                handleBlockchainResponse(responseAll().data);
                break;
        }
    });
};

const handleBlockchainResponse = receiveBlocks =>{

    if(receiveBlocks.length === 0){
        console.log('Received blocks have a length of 0');
        return;
    }
    const latestBlockReceived = receiveBlocks[receiveBlocks.length -1];

    // todo- 재네시스 블럭의 경우 체크 필요 함. 
    if(!isBlockStructureValid(latestBlockReceived)){
        console.log("The block structure of the block received is not valid");
        return;
    }
    const newestBlock = getNewestBlock();
    if(latestBlockReceived.index > newestBlock.index){
        if(newestBlock.hash === latestBlockReceived.previousHash){
            if(addBlockToChain(latestBlockReceived)){
                broadcastNewBlock();
            }
        }else if(receiveBlocks.length === 1){
            console.log('latestBlockReceived.length === 1');
            sendMessageToAll(getALL());
        }else{
            replaceChain(receiveBlocks);
        }
    }
};

const sendMessage = (ws, message)=>{
    ws.send(JSON.stringify(message));
}

const sendMessageToAll = message =>{
    sockets.forEach(ws => sendMessage(ws, message));
}

const responseLatest = () => blockchainResponse([getNewestBlock()]);

const responseAll = () => blockchainResponse(getBlockchain());

const broadcastNewBlock = ()=> sendMessageToAll(responseLatest());

const handleSocketError = ws =>{
    const closeSocketConnection = ws =>{
        ws.close();
        sockets.splice(sockets.indexOf(ws), 1);
    }
    ws.on("close", ()=> closeSocketConnection(ws));
    ws.on("error", ()=> closeSocketConnection(ws));
}

const connectToPeers = newPeer =>{
    
    const ws = new WebSockets(newPeer);
    ws.on("open", ()=>{
        initSocketConnection(ws);
    });
};


module.exports ={
    startP2PServer,
    connectToPeers,
    broadcastNewBlock
}