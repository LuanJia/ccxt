'use strict';

// ----------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');

// ----------------------------------------------------------------------------
module.exports = class bitvavo extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'bitvavo',
            'name': 'Bitvavo',
            'countries': [ 'NL' ], // Netherlands
            'rateLimit': 100,
            'version': 'v2',
            'certified': true,
            'has': {
                'CORS': false,
                'publicAPI': true,
                'privateAPI': true,
                'fetchCurrencies': true,
                'fetchMarkets': true,
                'fetchTime': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/82067900-faeb0f80-96d9-11ea-9f22-0071cfcb9871.jpg',
                'api': {
                    'public': 'https://api.bitvavo.com',
                    'private': 'https://api.bitvavo.com',
                },
                'www': 'https://bitvavo.com/',
                'doc': 'https://docs.bitvavo.com/',
                'fees': 'https://bitvavo.com/en/fees',
            },
            'api': {
                'public': {
                    'get': [
                        'time',
                        'markets',
                        'assets',
                        '{market}/book',
                        '{market}/trades',
                        '{market}/candles',
                        'ticker/price',
                        'ticker/book',
                        'ticker/24h',
                    ],
                },
                'private': {
                    'get': [
                        'order',
                        'orders',
                        'ordersOpen',
                        'trades',
                        'balance',
                        'deposit',
                        'depositHistory',
                        'withdrawalHistory',
                    ],
                    'post': [
                        'order',
                        'withdrawal',
                    ],
                    'put': [
                        'order',
                    ],
                    'delete': [
                        'order',
                        'orders',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                    'taker': 0.25 / 100,
                    'maker': 0.20 / 100,
                    'tiers': {
                        'taker': [
                            [ 0, 0.0025 ],
                            [ 50000, 0.0024 ],
                            [ 100000, 0.0022 ],
                            [ 250000, 0.0020 ],
                            [ 500000, 0.0018 ],
                            [ 1000000, 0.0016 ],
                            [ 2500000, 0.0014 ],
                            [ 5000000, 0.0012 ],
                            [ 10000000, 0.0010 ],
                        ],
                        'maker': [
                            [ 0, 0.0020 ],
                            [ 50000, 0.0015 ],
                            [ 100000, 0.0010 ],
                            [ 250000, 0.0006 ],
                            [ 500000, 0.0003 ],
                            [ 1000000, 0.0001 ],
                            [ 2500000, -0.0001 ],
                            [ 5000000, -0.0003 ],
                            [ 10000000, -0.0005 ],
                        ],
                    },
                },
            },
            'requiredCredentials': {
                'apiKey': true,
                'secret': true,
            },
            'exceptions': {
                'exact': {
                },
                'broad': {
                },
            },
        });
    }

    async fetchTime (params = {}) {
        const response = await this.publicGetTime (params);
        //
        //     { "time": 1590379519148 }
        //
        return this.safeInteger (response, 'time');
    }

    async fetchMarkets (params = {}) {
        const response = await this.publicGetMarkets (params);
        //
        //     [
        //         {
        //             "market":"ADA-BTC",
        //             "status":"trading", // "trading" "halted" "auction"
        //             "base":"ADA",
        //             "quote":"BTC",
        //             "pricePrecision":5,
        //             "minOrderInBaseAsset":"100",
        //             "minOrderInQuoteAsset":"0.001",
        //             "orderTypes":["market","limit"]
        //         }
        //     ]
        //
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const market = this.parseMarket (response[i]);
            result.push (market);
        }
        return result;
    }

    parseMarket (market) {
        //
        //     {
        //         "market":"ADA-BTC",
        //         "status":"trading", // "trading" "halted" "auction"
        //         "base":"ADA",
        //         "quote":"BTC",
        //         "pricePrecision":5,
        //         "minOrderInBaseAsset":"100",
        //         "minOrderInQuoteAsset":"0.001",
        //         "orderTypes":["market","limit"]
        //     }
        //
        const id = this.safeString (market, 'market');
        const baseId = this.safeString (market, 'base');
        const quoteId = this.safeString (market, 'quote');
        const base = this.safeCurrencyCode (baseId);
        const quote = this.safeCurrencyCode (quoteId);
        const symbol = base + '/' + quote;
        const status = this.safeString (market, 'status');
        const active = (status === 'trading');
        const precision = {
            'price': this.safeInteger (market, 'pricePrecision'),
            'amount': undefined,
        };
        return {
            'id': id,
            'symbol': symbol,
            'base': base,
            'quote': quote,
            'baseId': baseId,
            'quoteId': quoteId,
            'info': market,
            'active': active,
            'precision': precision,
            'limits': {
                'amount': {
                    'min': this.safeFloat (market, 'minOrderInBaseAsset'),
                    'max': undefined,
                },
                'price': {
                    'min': undefined,
                    'max': undefined,
                },
                'cost': {
                    'min': this.safeFloat (market, 'minOrderInQuoteAsset'),
                    'max': undefined,
                },
            },
        };
    }

    async fetchCurrencies (params = {}) {
        const response = await this.publicGetAssets (params);
        //
        //     [
        //         {
        //             "symbol":"ADA",
        //             "name":"Cardano",
        //             "decimals":6,
        //             "depositFee":"0",
        //             "depositConfirmations":15,
        //             "depositStatus":"OK", // "OK", "MAINTENANCE", "DELISTED"
        //             "withdrawalFee":"0.2",
        //             "withdrawalMinAmount":"0.2",
        //             "withdrawalStatus":"OK", // "OK", "MAINTENANCE", "DELISTED"
        //             "networks":["Mainnet"], // "ETH", "NEO", "ONT", "SEPA", "VET"
        //             "message":"",
        //         },
        //     ]
        //
        const result = {};
        for (let i = 0; i < response.length; i++) {
            const currency = response[i];
            const id = this.safeString (currency, 'symbol');
            const code = this.safeCurrencyCode (id);
            const depositStatus = this.safeValue (currency, 'depositStatus');
            const deposit = (depositStatus === 'OK');
            const withdrawalStatus = this.safeValue (currency, 'withdrawalStatus');
            const withdrawal = (withdrawalStatus === 'OK');
            const active = deposit && withdrawal;
            const name = this.safeString (currency, 'name');
            const precision = this.safeInteger (currency, 'decimals');
            result[code] = {
                'id': id,
                'info': currency,
                'code': code,
                'name': name,
                'active': active,
                'fee': this.safeFloat (currency, 'withdrawalFee'),
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'price': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': this.safeFloat (currency, 'withdrawalMinAmount'),
                        'max': undefined,
                    },
                },
            };
        }
        return result;
    }

    sign (path, api = 'public', method = 'GET', params = {}, httpHeaders = undefined, body = undefined) {
        const query = this.omit (params, this.extractParams (path));
        let url = '/' + this.version + '/' + this.implodeParams (path, params);
        if (method === 'GET') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        }
        if (api === 'private') {
            this.checkRequiredCredentials ();
        }
        url = this.urls['api'][api] + url;
        return { 'url': url, 'method': method, 'body': body, 'headers': httpHeaders };
    }
};
