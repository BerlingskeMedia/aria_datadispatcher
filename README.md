# aria_datadispatcher

## Terminology

* _Client application_: ARIA + AMPS
* _Server application_: Data Dispatcher, a webservice implemented by Berlingske to recieve notifications from ARIA + AMPS.
* _Auth server_: [BPC](https://github.com/BerlingskeMedia/bpc)
* _Hawk_: An HTTP authentication scheme [github.com/hapijs/hawk](https://github.com/hapijs/hawk)

## Architecture

TODO

## API

TODO

## Security

Each request is signed with a Hawk header in the HTTP Authorization header.

The Hawk header contains a **MAC**, which is calculated using HMAC [en.wikipedia.org/wiki/HMAC](https://en.wikipedia.org/wiki/HMAC) with:
1. A set of credentials (ID + secret key), issued by Berlingske Media.
2. A Unix timestamp. Hawk allows for 1 minute time skew of the clock between the server and client. This in practice translates to a maximum of 2 minutes as the skew can be positive or negative.
3. A nonce - ie. a string generated by the client application (ARIA). The nonce must the unique across all requests with the same timestamp and key combination.

The Hawk header also contains a **hash** calculated over with the request payload.

Both the MAC and the hash is calculated using the SHA-256 (https://en.wikipedia.org/wiki/SHA-2) algorithm.

The easiest way to generate a Hawk header, is to use an existing library.
Alternatively it can be calculated manually using generally available crypto tools.

For more information on Hawk, see https://github.com/hapijs/hawk.

### Example

Below is an example explaining the process for both the client and server application.

##### Generation the Hawk Authorization header on the client

*Note*: This can also be done using Postman.

The client application has, by other means, obtained the set of credentials:
* ID: `aria`
* Key: `somerandomcharacterstring`
* Algoritm: `sha256`

The endpoint and method, to which the request must be signed, are:
* URI: `https://notifications.berlingskemedia.net/webhooks`
* Method: `POST`

The payload and content-type, the request contains, are:
* Content-type: `text/plain`
* Payload: `this is a test payload`

Timestamp and nonce must be generated.

The Hawk Authorization header will then be:

```
Hawk id="aria", ts="1556624461", nonce="QmbuDC", hash="hxnRPTxATAovVOhYn/20neTXXLtBXyl+t/VjWf971mQ=", mac="aGkvqovoApV1s9d32vPJk3T9kQNGTU8DNMX8EhIQr80="
```

The request will look like this:

```
POST/webhooks HTTP/1.1
Host: notifications.berlingskemedia.net:443
Authorization: Hawk id="aria_notifications", ts="1556624461", nonce="QmbuDC", hash="hxnRPTxATAovVOhYn/20neTXXLtBXyl+t/VjWf971mQ=", mac="aGkvqovoApV1s9d32vPJk3T9kQNGTU8DNMX8EhIQr80="
Content-Type: text/plain
 
this is a test payload
```

##### Request validation on server

This part is implemented by Berlingske Media's Data Dispatcher.

After receiving a request from the client signed with a Hawk Authorization header, the Data Dispatcher validates the request against Auth server, BPC. BPC is the authoritative register of Berlingske Hawk credentials.

The Data Dispatcher will have its own set of Hawk credentials, also issued by BPC, and an app ticket for accessing the features on BPC.

The validation is done using the following request.

```
POST /validate/credentials
Host: bpc.berlingskemedia.net:443
Authorization: Hawk id="aria_datadispatcher" ts="1556626940", nonce="WgdvVV", mac="UiPM+PsE4jEO62Uqvd6CymUUISFfYVjEERl5/jNnJaU="
Content-Type: application/json
 
{
  "url": "https://notifications.berlingskemedia.net/webhooks",
  "method": "POST",
  "authorization": "Hawk id=\"aria_notifications\", ts=\"1556624461\", nonce=\"QmbuDC\", hash=\"hxnRPTxATAovVOhYn/20neTXXLtBXyl+t/VjWf971mQ=\", mac=\"aGkvqovoApV1s9d32vPJk3T9kQNGTU8DNMX8EhIQr80=\"",
  "payload": "this is a test payload",
  "contentType": "text/plain"
}
```

If valid, the response from BPC will be a `200 OK` with payload:

```
{ 
  "method": "POST",
  "host": "notifications.berlingskemedia.net",
  "port": 443,
  "resource": "/webhooks",
  "ts": "1556624461",
  "nonce": "QmbuDC",
  "hash": "hxnRPTxATAovVOhYn/20neTXXLtBXyl+t/VjWf971mQ=",
  "ext": undefined,
  "app": undefined,
  "dlg": undefined,
  "mac": "aGkvqovoApV1s9d32vPJk3T9kQNGTU8DNMX8EhIQr80=",
  "id": "aria"
}
```

If not valid, the response from BPC will be a `403 Forbidden`.

### Performance considerations

To simply the security complexity on the client of handling credentials, the above solution is not using BPC tickets. See [Using only app credentials and no tickets](https://github.com/BerlingskeMedia/bpc/blob/master/doc/ServerToServer.md#using-bpc-to-secure-an-api)

Ie. the requests to Data Dispatcher is signed using app credentials - not, as usally, a BPC ticket.

The benefit it that the client application does not need to request a ticket and keep reissuing it upon expiration.

A downside is that the Auth server need to fetch the application key from the database for each request. Whereas when using tickets, the ticket `id` is an encrypted signature containing all necessary parts to do a validation on the Auth server. 

Another downside is that the validation does not support [BPC scope](https://github.com/BerlingskeMedia/bpc#scope). In practice this means that all apps registered in BPC are allowed to pass the authorization. Whereas when using tickets, only apps with the scope eg. `aria_notifications` will pass the authorization.

It is, however, unverified what the difference in performance between these two approaches are.

## Build

This application is build using [Docker Cloud](https://cloud.docker.com/u/berlingskemedia/repository/docker/berlingskemedia/aria_datadispatcher).

To start a build make a new release on [GitHub](https://github.com/BerlingskeMedia/aria_datadispatcher/releases).
Make sure the versionnumber is in the format `x.x.x`. This will trigger a new build with tag `release-{sourceref}` and `latest`.

## Deployment

For testing we are deploying using AWS Elastic Beanstalk.

Later we must use EKS.
