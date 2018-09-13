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
        // console.log('handleSocketMessage 시작 => message on ');
        // console.log(`message.type ::  ${message.type}`);
        // console.log(message);
        switch(message.type){
            case GET_LATEST:
                // 이부분이 잘 이해 되지 않음. GET_LATEST 는 어디서 넣지??
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
                
                // const blockchain = responseAll();
                console.log(`GET_ALL---- ::`);
                console.log(responseAll().data);
                console.log('여기까지 오긴 했는데...');
                handleBlockchainResponse(responseAll().data);
                break;
        }
    });
};

const handleBlockchainResponse = receiveBlocks =>{
    // console.log(`receiveBlocks :: ${receiveBlocks}`);

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

    console.log('receiveBlocks :: receiveBlocks.length === 1 ;::'+receiveBlocks.length );
    console.log(receiveBlocks);
    console.log('latestBlockReceived :: latestBlockReceived.index  ::' + latestBlockReceived.index );
    console.log(latestBlockReceived);
    console.log('newestBlock :: newestBlock.index  ::' + newestBlock.index );
    console.log(newestBlock);

    if(latestBlockReceived.index > newestBlock.index){
        if(newestBlock.hash === latestBlockReceived.previousHash){
            addBlockToChain(latestBlockReceived);
        }else if(receiveBlocks.length === 1){
            console.log('latestBlockReceived.length === 1');
            console.log('여기는 몇번을 타고 있을까~!!!');
            sendMessageToAll(getALL());
        }else{
            console.log('여기까진 왔나???');
            console.log('receiveBlocks :: receiveBlocks.length ::'+receiveBlocks.length);
            console.log(receiveBlocks);
            console.log('latestBlockReceived :: latestBlockReceived.length ::'+latestBlockReceived.length);
            console.log(latestBlockReceived);

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

const responseAll = () =>{
    // console.log('responseAll ::');
    // // // console.log(getBlockchain());
    // console.log(blockchainResponse(getBlockchain()));
    return blockchainResponse(getBlockchain());
}

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
    connectToPeers
}