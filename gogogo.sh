#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

coin_path=
output_dir=$DIR
target_coins="USDC,ETH"
path_len_trades="3"

while getopts "o:c:t:l:" opt; do
    case ${opt} in
        c ) if [[ ${OPTARG} = /* ]]; then
                coin_path=${OPTARG}
            else
                coin_path=${DIR}/${OPTARG}
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
        l ) path_len_trades=${OPTARG}
            ;;
        \? ) echo "Invalid option: -${OPTARG}\n"
            exit 1
            ;;
    esac
done

echo "Fetching pairs info ..."
pushd $DIR/pairs_fetcher > /dev/null
if [ -z "$coin_path" ]; then
    ./fetch_all.ts -p $output_dir
else
    ./fetch_all.ts -c $coin_path -p $output_dir
fi
popd > /dev/null

echo "Compute potential trade path ..."
targets=(${target_coins//,/ })
pushd $DIR/pairs_arbitrage > /dev/null
for target in "${targets[@]}"
do
    target_lower=$(echo "$target" | awk '{print tolower($0)}')
    ./find_trades.ts -p "$output_dir/pairs_[!e]*.json" -l $path_len_trades -c $target -o $output_dir/paths_${target_lower}.json &
done

# Wait until finish
wait
popd > /dev/null

echo "Done!"
