require('dotenv').config();
const ethers = require('ethers');
const { parseUnits, JsonRpcProvider, Contract, Wallet } = ethers;

// Configuration
const privateKey = process.env.PRIVATE_KEY;
const tokenAddress = '0x53ff62409b219ccaff01042bb2743211bb99882e';

// BSC Mainnet
const provider = new JsonRpcProvider('https://bsc-dataseed.binance.org/');

// Signer
const wallet = new Wallet(privateKey, provider);

// Token Contract
const tokenContract = new Contract(tokenAddress, [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
], wallet);

async function sendToken(recipientAddress, amountToSend) {
    try {        
        const tx = await tokenContract.transfer(recipientAddress, parseUnits(`${amountToSend}`, 18));        
        await tx.wait();

        return tx;
    } catch (error) {
        console.error('Error sending token:', error);
    }
}


module.exports = sendToken;