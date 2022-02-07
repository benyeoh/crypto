#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

coin_flag=
path_len_flag=
networks_flag=
output_dir=$DIR
target_coins="USDC,ETH"
trades_filter="*"

while getopts "o:c:t:l:n:f:" opt; do
    case ${opt} in
        c ) if [[ ${OPTARG} = /* ]]; then
                coin_flag="-c ${OPTARG}"
            else
                coin_flag="-c ${DIR}/${OPTARG}"
            fi
            ;;            
        o ) if [[ ${OPTARG} = /* ]]; then
                output_dir=${OPTARG}
            else
                output_dir=${DIR}/${OPTARG}
            fi
            ;;
        t ) target_coins=${OPTARG}
            ;;
        f ) trades_filter=${OPTARG}
            ;;
        l ) path_len_flag="-l ${OPTARG}"
            ;;
        n ) networks_flag="-n ${OPTARG}"
            ;;
        \? ) echo "Invalid option: -${OPTARG}\n"
            exit 1
            ;;
    esac
done

echo "Fetching pairs info ..."
pushd $DIR/pairs_fetcher > /dev/null
./fetch_all.ts $coin_flag $networks_flag -p $output_dir
popd > /dev/null

echo "Compute potential trade path ..."
targets=(${target_coins//,/ })
pushd $DIR/pairs_arbitrage > /dev/null
for target in "${targets[@]}"
do
    target_lower=$(echo "$target" | awk '{print tolower($0)}')
    ./find_trades.ts -p "$output_dir/pairs_${trades_filter}.json" $path_len_flag -c $target -o $output_dir/paths_${target_lower}.json &
done

# Wait until finish
wait
popd > /dev/null

echo "Done!"
