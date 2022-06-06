import { Provider } from "ethcall";

export class CustomAddrProvider extends Provider {
    setAddr(addr: string) {
        this.multicall = {
            address: addr,
            block: 0
        };
    }
}