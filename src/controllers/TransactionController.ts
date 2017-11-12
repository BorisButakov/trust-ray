import { Request, Response } from "express";
import { sendJSONresponse } from "../common/Utils";
import { Transaction } from "../models/TransactionModel";
import { ERC20Contract } from "../models/Erc20ContractModel";


export class TransactionController {

    public readAllTransactions(req: Request, res: Response) {
        const queryParams = TransactionController.extractQueryParameters(req);

        // build up query
        const query: any = {};
        if (queryParams.address) {
            const address = queryParams.address.toLowerCase();
            query.addresses = { "$in": [address] };
        }
        query.blockNumber = { "$gte": queryParams.startBlock, "$lte": queryParams.endBlock};

        Transaction.paginate(query, {
            page: queryParams.page,
            limit: queryParams.limit,
            sort: {timeStamp: -1},
            populate: {
                path: "operations",
                populate: {
                    path: "contract",
                    model: "ERC20Contract"
                }
            }
        }).then((transactions: any) => {
            sendJSONresponse(res, 200, transactions);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });

    }

    public readOneTransaction(req: Request, res: Response) {
        if (!req.params || !req.params.transactionId) {
            sendJSONresponse(res, 404, { "message": "No transaction ID in request" });
            return;
        }
        Transaction.findOne({
            _id: req.params.transactionId
        }).populate({
            path: "operations",
            populate: {
                path: "contract",
                model: "ERC20Contract"
            }
        }).exec().then((transaction: any) => {
            if (!transaction) {
                sendJSONresponse(res, 404, {"message": "transaction ID not found"});
                return;
            }
            sendJSONresponse(res, 200, transaction);
        }).catch((err: Error) => {
            sendJSONresponse(res, 404, err);
        });
    }

    private static extractQueryParameters(req: Request) {

        // page parameter
        let page = parseInt(req.query.page);
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        // limit parameter
        let limit = parseInt(req.query.limit);
        if (isNaN(limit)) {
            limit = 50;
        } else if (limit > 500) {
            limit = 500;
        } else if (limit < 1) {
            limit = 1;
        }

        // address parameter
        const address = req.query.address;

        // start block parameter
        let startBlock = parseInt(req.query.startBlock);
        if (isNaN(startBlock) || startBlock < 1) {
            startBlock = 1;
        }

        // end block parameter
        let endBlock = parseInt(req.query.endBlock);
        if (isNaN(endBlock) || endBlock < 1 || endBlock < startBlock) {
            endBlock = 9999999999;
        }

        return {
            address: address,
            startBlock: startBlock,
            endBlock: endBlock,
            page: page,
            limit: limit
        };
    }

}