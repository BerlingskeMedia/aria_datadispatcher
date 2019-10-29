/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('@hapi/code');
const { describe, it, before, after, afterEach } = exports.lab = require('@hapi/lab').script();


const server = require('../server');
const KafkaSpy = require('./helpers/kafka_spy.js');
const SQSSpy = require('./helpers/aws_sqs_spy.js');


async function request(options) {

  const req = {
    method: options.method ? options.method : 'GET',
    url: options.url,
    payload: options.payload,
    headers: Object.assign(options.headers || {},
      {
        host: 'testing.com'
      }
    )
  };
  
  // We don't need to reject anything. We only resolve and the tests should validate the response
  return await server.inject(req);
};


describe('auth scheme tests', async () => {
  

  before(async () => {
  });


  after(async () => {
  });


  afterEach(async () => {
    KafkaSpy.reset();
    SQSSpy.reset();
  });


  it('endpoint should return 200 when reversed content version 2 is valid 2', async () => {
    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-06-01T09:48:32Z",
      signatureValue: "snTyOietaSS8gf2qMAoY9cXqX79DVhg5O/EFVh9wUL4=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 2,
      userID: "ASaeed"
    };

    const eventPayload = { request: { transaction_id: 1 }, subdocument: { test: 1, anothervalue: 'text' }};

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { eventPayload, msgAuthDetails } });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(1, '{"request":{"transaction_id":1},"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(1, '{"request":{"transaction_id":1},"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
  });



  it('endpoint should return 200 when auth header is test and payload includes msgAuthDetails', async () => {
      
    const headers = {
      'Authorization': 'clientNo="TEST", requestDateTime="1971-07-01T01:48:31Z", signatureValue="TEST", ariaAccountID="AccountID", ariaAccountNo="1234567", signatureVersion=2, userID="TEST"'
    };

    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-03T07:48:31Z",
      signatureValue: "iIDhHq+DzsR2tubtQQ2xbrRi39JWyCbvrOFzfk5OrII=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 2,
      userID: "ASaeed"
    };

    const eventPayload = { request: { transaction_id: 2 }, subdocument: { test: 1, anothervalue: 'text' }};

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { eventPayload, msgAuthDetails }, headers });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(2, '{"request":{"transaction_id":2},"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
    expect(SQSSpy.deliver.calledWith(2, '{"request":{"transaction_id":2},"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
  });


  it('allow signatureVersion to be a string', async () => {

    const payload = {
      "msgAuthDetails": {
          "ariaAccountID": null,
          "ariaAccountNo": 41998358,
          "userID": null,
          "clientNo": 25,
          "authKey": null,
          "requestDateTime": "2019-09-03T23:41:42Z",
          "signatureValue": "420ujbOZUMBBnMd/CxlHfiIQtemgfmEM/3MH62uGleU=",
          "signatureVersion": "2"
      },
      "accAccessControlAIDInfo": {
          "accAccessControlAIDFeatureList": [
              {
                  "accessFeature": "WEB/APP",
                  "eligibleForSharing": false,
                  "titleDomain": "www.berlingske.dk"
              }
          ],
          "ariaAccountID": null,
          "ariaAccountNo": 41998358,
          "numberOfAllotments": 0,
          "some_unique_event_id": 3
      }
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledWith(3, '{"accAccessControlAIDFeatureList":[{"accessFeature":"WEB/APP","eligibleForSharing":false,"titleDomain":"www.berlingske.dk"}],"ariaAccountID":null,"ariaAccountNo":41998358,"numberOfAllotments":0,"some_unique_event_id":3}')).to.equal(true);
    expect(SQSSpy.deliver.calledWith(3, '{"accAccessControlAIDFeatureList":[{"accessFeature":"WEB/APP","eligibleForSharing":false,"titleDomain":"www.berlingske.dk"}],"ariaAccountID":null,"ariaAccountNo":41998358,"numberOfAllotments":0,"some_unique_event_id":3}')).to.equal(true);
  });


  it('allow userID to be null', async () => {

    const payload = {
      "msgAuthDetails": {
          "ariaAccountID": null,
          "ariaAccountNo": 41998377,
          "userID": null,
          "clientNo": 25,
          "authKey": null,
          "requestDateTime": "2019-09-03T23:41:42Z",
          "signatureValue": "IIp44ACADznRX/vokoKHJoIwKk6lb8hH4D96y/8ScEg=",
          "signatureVersion": "2"
      },
      "accAccessControlAIDInfo": {
          "accAccessControlAIDFeatureList": [],
          "ariaAccountID": null,
          "ariaAccountNo": 41998377,
          "numberOfAllotments": 0,
          "some_unique_event_id": 4
      }
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload });
    expect(response.statusCode).to.equal(200);

    expect(SQSSpy.deliver.calledWith(4, '{"accAccessControlAIDFeatureList":[],"ariaAccountID":null,"ariaAccountNo":41998377,"numberOfAllotments":0,"some_unique_event_id":4}')).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(4, '{"accAccessControlAIDFeatureList":[],"ariaAccountID":null,"ariaAccountNo":41998377,"numberOfAllotments":0,"some_unique_event_id":4}')).to.equal(true);
  });

  
  it('test AMPSEventID=1 SUBSCRIPTION', async () => {

    const payload = {
      "msgAuthDetails": {
        "userID": "34934396",
        "signatureVersion": 2,
        "ariaAccountNo": 42036867,
        "ariaAccountID": null,
        "signatureValue": "voFQskZvVsDqqNbxaXdg5fh9iZCaccScDbll7gWQbOs=",
        "requestDateTime": "2019-09-05T09:54:43Z",
        "authKey": null,
        "clientNo": 25
      },
      "AMPSEventData": {
        "AMPSEventIdent": {
          "AMPSEventID": 1,
          "AMPSEventClass": "SUBSCRIPTION"
        },
        "AMPSEventDetail": {
          "AMPSEvent_TestTransactionId": 12,
          "AMPSEvent_SubscriptionReplaced": null,
          "AMPSEvent_SubscriptionModified": null,
          "AMPSEvent_SubscriptionDowngraded": null,
          "AMPSEvent_SubscriptionCancelled": null,
          "AMPSEvent_SubscriptionAdded": {
            "AMPSSubscriptionIDs": {
              "AriaSubscriptionNo": 130338057,
              "AriaSubscriptionID": "BER-C-DIGITAL-PLUS-e42d6aca-ca34-419e-831d-623b822eb834"
            },
            "AMPSSubscriptionDetails": {
              "SubsPlanInstanceDetails": {
                "AMPSPlanInstanceDetails": {
                  "PlanEffectiveDate": "",
                  "activationDate": "",
                  "PlanUsageBillInterval": 3,
                  "PlanUnits": 1,
                  "PlanReccBillInterval": 3,
                  "PlanPurchaseOrderNo": null,
                  "PlanNextBillDate": "2019-12-05T00:00:00",
                  "PlanBillThruDate": "2019-12-04T00:00:00",
                  "PlanBillDay": 5,
                  "PlanAssignmentDate": "2019-09-05T00:00:00",
                  "AriarateScheduleName": "Berlingske Digital+ kvartal",
                  "AriaSubscriptionDesc": null,
                  "AriaRateScheduleNo": 375520,
                  "AriaRateScheduleID": "BER-C-DIGITAL-PLUS-DKK-03",
                  "AriaDunningGroupNo": 42988552,
                  "AriaDunningGroupID": "DG-b257abdb-5947-446a-93bf-553bfd1a348b",
                  "AriaBillingGroupNo": 41401104,
                  "AriaBillingGroupID": "BG-b257abdb-5947-446a-93bf-553bfd1a348b",
                  "PlanLastBillDate": "2019-09-05T00:00:00",
                  "PlanInstanceStatusDate": "2019-09-05T00:00:00",
                  "PlanInstanceStatusCodeLabel": "Active",
                  "PlanInstanceStatusCode": 1,
                  "PlanDunningStep": 0,
                  "PlanDunningState": 0,
                  "PlanDunningDegradeDate": "",
                  "PlanDeprovisionedDate": "",
                  "PlanCreateDate": "2019-09-05T00:00:00"
                },
                "AMPSPlanDetails": {
                  "ProductTypeVariant": "STANDARD",
                  "ProductType": "DIGITAL",
                  "AriaPlanNo": 102319,
                  "AriaPlanName": "Berlingske - Digital Plus",
                  "AriaPlanID": "BER-C-DIGITAL-PLUS",
                  "AriaPlanDesc": "Berlingske Digital+ hele ugen\n",
                  "AMPSTitleDetails": [
                    {
                      "TitleName": "Berlingsk",
                      "TitleDomain": "www.berlingske.dk",
                      "TitleDesc": "Berlingsk",
                      "TitleCode": "BER"
                    }
                  ]
                }
              },
              "SubsDiscountDetails": [],
              "SubsCampaignDetails": {
                "CampaignDateStart": "",
                "CampaignDateEnd": "",
                "CampaignBillingSKU": null,
                "CampaignBillingPriceVAT": null,
                "CampaignBillingPriceInclVAT": null,
                "CampaignBillingPriceExclVAT": null,
                "CampaignBillingCode": null,
                "CampaignDesc": null,
                "CampaignName": null,
                "CampaignID": null,
                "CampaignDurationUnit": null,
                "CampaignDurationLength": 0,
                "CampaignDurationEndDate": ""
              },
              "SubsBundleDetails": null
            },
            "AMPSSubscriptionAction": {
              "PlanInstanceStatusCodeUntilLabel": "Active",
              "PlanInstanceStatusCodeUntil": 1,
              "PlanChangeMethod": "IMMEDIATELY",
              "PlanChangeDate": "2019-09-05T00:00:00"
            },
            "AMPSAccountIDs": {
              "AriaUserID": "34934396",
              "AriaAccountNo": 42036867,
              "AriaAccountID": null,
              "AcctMigratedCustomerID": ""
            },
            "AMPSAccountDetails": {
              "AcctCustomerType": "C",
              "AcctCurrencyCode": "dkk",
              "AcctConsentCodeDate": "",
              "AcctConsentCode": "",
              "AcctChannelCode": "",
              "AcctTitleCode": "BER",
              "AcctTaxpayerID": null,
              "AcctSourceCode": "",
              "AcctReservationCodeDate": "",
              "AcctReservationCode": "",
              "AcctPurchaseOrderNo": null,
              "AcctNotifyMethod": 1,
              "AcctLocaleCode": "DK-DANSK",
              "AcctLanguageCode": null
            }
          },
          "AMPSEvent_AccountModified": null,
          "AMPSEvent_AccountCreated": null,
          "AMPSEvent_AccountCreditCardUpdated": null,
          "AMPSEvent_SubscriptionUpgraded": null
        }
      }
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload });
    expect(response.statusCode).to.equal(200);

    expect(SQSSpy.deliver.calledWith(12, '{"AMPSEventIdent":{"AMPSEventID":1,"AMPSEventClass":"SUBSCRIPTION"},"AMPSEventDetail":{"AMPSEvent_TestTransactionId":12,"AMPSEvent_SubscriptionReplaced":null,"AMPSEvent_SubscriptionModified":null,"AMPSEvent_SubscriptionDowngraded":null,"AMPSEvent_SubscriptionCancelled":null,"AMPSEvent_SubscriptionAdded":{"AMPSSubscriptionIDs":{"AriaSubscriptionNo":130338057,"AriaSubscriptionID":"BER-C-DIGITAL-PLUS-e42d6aca-ca34-419e-831d-623b822eb834"},"AMPSSubscriptionDetails":{"SubsPlanInstanceDetails":{"AMPSPlanInstanceDetails":{"PlanEffectiveDate":"","activationDate":"","PlanUsageBillInterval":3,"PlanUnits":1,"PlanReccBillInterval":3,"PlanPurchaseOrderNo":null,"PlanNextBillDate":"2019-12-05T00:00:00","PlanBillThruDate":"2019-12-04T00:00:00","PlanBillDay":5,"PlanAssignmentDate":"2019-09-05T00:00:00","AriarateScheduleName":"Berlingske Digital+ kvartal","AriaSubscriptionDesc":null,"AriaRateScheduleNo":375520,"AriaRateScheduleID":"BER-C-DIGITAL-PLUS-DKK-03","AriaDunningGroupNo":42988552,"AriaDunningGroupID":"DG-b257abdb-5947-446a-93bf-553bfd1a348b","AriaBillingGroupNo":41401104,"AriaBillingGroupID":"BG-b257abdb-5947-446a-93bf-553bfd1a348b","PlanLastBillDate":"2019-09-05T00:00:00","PlanInstanceStatusDate":"2019-09-05T00:00:00","PlanInstanceStatusCodeLabel":"Active","PlanInstanceStatusCode":1,"PlanDunningStep":0,"PlanDunningState":0,"PlanDunningDegradeDate":"","PlanDeprovisionedDate":"","PlanCreateDate":"2019-09-05T00:00:00"},"AMPSPlanDetails":{"ProductTypeVariant":"STANDARD","ProductType":"DIGITAL","AriaPlanNo":102319,"AriaPlanName":"Berlingske - Digital Plus","AriaPlanID":"BER-C-DIGITAL-PLUS","AriaPlanDesc":"Berlingske Digital+ hele ugen\\n","AMPSTitleDetails":[{"TitleName":"Berlingsk","TitleDomain":"www.berlingske.dk","TitleDesc":"Berlingsk","TitleCode":"BER"}]}},"SubsDiscountDetails":[],"SubsCampaignDetails":{"CampaignDateStart":"","CampaignDateEnd":"","CampaignBillingSKU":null,"CampaignBillingPriceVAT":null,"CampaignBillingPriceInclVAT":null,"CampaignBillingPriceExclVAT":null,"CampaignBillingCode":null,"CampaignDesc":null,"CampaignName":null,"CampaignID":null,"CampaignDurationUnit":null,"CampaignDurationLength":0,"CampaignDurationEndDate":""},"SubsBundleDetails":null},"AMPSSubscriptionAction":{"PlanInstanceStatusCodeUntilLabel":"Active","PlanInstanceStatusCodeUntil":1,"PlanChangeMethod":"IMMEDIATELY","PlanChangeDate":"2019-09-05T00:00:00"},"AMPSAccountIDs":{"AriaUserID":"34934396","AriaAccountNo":42036867,"AriaAccountID":null,"AcctMigratedCustomerID":""},"AMPSAccountDetails":{"AcctCustomerType":"C","AcctCurrencyCode":"dkk","AcctConsentCodeDate":"","AcctConsentCode":"","AcctChannelCode":"","AcctTitleCode":"BER","AcctTaxpayerID":null,"AcctSourceCode":"","AcctReservationCodeDate":"","AcctReservationCode":"","AcctPurchaseOrderNo":null,"AcctNotifyMethod":1,"AcctLocaleCode":"DK-DANSK","AcctLanguageCode":null}},"AMPSEvent_AccountModified":null,"AMPSEvent_AccountCreated":null,"AMPSEvent_AccountCreditCardUpdated":null,"AMPSEvent_SubscriptionUpgraded":null}}')).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(12, '{"AMPSEventIdent":{"AMPSEventID":1,"AMPSEventClass":"SUBSCRIPTION"},"AMPSEventDetail":{"AMPSEvent_TestTransactionId":12,"AMPSEvent_SubscriptionReplaced":null,"AMPSEvent_SubscriptionModified":null,"AMPSEvent_SubscriptionDowngraded":null,"AMPSEvent_SubscriptionCancelled":null,"AMPSEvent_SubscriptionAdded":{"AMPSSubscriptionIDs":{"AriaSubscriptionNo":130338057,"AriaSubscriptionID":"BER-C-DIGITAL-PLUS-e42d6aca-ca34-419e-831d-623b822eb834"},"AMPSSubscriptionDetails":{"SubsPlanInstanceDetails":{"AMPSPlanInstanceDetails":{"PlanEffectiveDate":"","activationDate":"","PlanUsageBillInterval":3,"PlanUnits":1,"PlanReccBillInterval":3,"PlanPurchaseOrderNo":null,"PlanNextBillDate":"2019-12-05T00:00:00","PlanBillThruDate":"2019-12-04T00:00:00","PlanBillDay":5,"PlanAssignmentDate":"2019-09-05T00:00:00","AriarateScheduleName":"Berlingske Digital+ kvartal","AriaSubscriptionDesc":null,"AriaRateScheduleNo":375520,"AriaRateScheduleID":"BER-C-DIGITAL-PLUS-DKK-03","AriaDunningGroupNo":42988552,"AriaDunningGroupID":"DG-b257abdb-5947-446a-93bf-553bfd1a348b","AriaBillingGroupNo":41401104,"AriaBillingGroupID":"BG-b257abdb-5947-446a-93bf-553bfd1a348b","PlanLastBillDate":"2019-09-05T00:00:00","PlanInstanceStatusDate":"2019-09-05T00:00:00","PlanInstanceStatusCodeLabel":"Active","PlanInstanceStatusCode":1,"PlanDunningStep":0,"PlanDunningState":0,"PlanDunningDegradeDate":"","PlanDeprovisionedDate":"","PlanCreateDate":"2019-09-05T00:00:00"},"AMPSPlanDetails":{"ProductTypeVariant":"STANDARD","ProductType":"DIGITAL","AriaPlanNo":102319,"AriaPlanName":"Berlingske - Digital Plus","AriaPlanID":"BER-C-DIGITAL-PLUS","AriaPlanDesc":"Berlingske Digital+ hele ugen\\n","AMPSTitleDetails":[{"TitleName":"Berlingsk","TitleDomain":"www.berlingske.dk","TitleDesc":"Berlingsk","TitleCode":"BER"}]}},"SubsDiscountDetails":[],"SubsCampaignDetails":{"CampaignDateStart":"","CampaignDateEnd":"","CampaignBillingSKU":null,"CampaignBillingPriceVAT":null,"CampaignBillingPriceInclVAT":null,"CampaignBillingPriceExclVAT":null,"CampaignBillingCode":null,"CampaignDesc":null,"CampaignName":null,"CampaignID":null,"CampaignDurationUnit":null,"CampaignDurationLength":0,"CampaignDurationEndDate":""},"SubsBundleDetails":null},"AMPSSubscriptionAction":{"PlanInstanceStatusCodeUntilLabel":"Active","PlanInstanceStatusCodeUntil":1,"PlanChangeMethod":"IMMEDIATELY","PlanChangeDate":"2019-09-05T00:00:00"},"AMPSAccountIDs":{"AriaUserID":"34934396","AriaAccountNo":42036867,"AriaAccountID":null,"AcctMigratedCustomerID":""},"AMPSAccountDetails":{"AcctCustomerType":"C","AcctCurrencyCode":"dkk","AcctConsentCodeDate":"","AcctConsentCode":"","AcctChannelCode":"","AcctTitleCode":"BER","AcctTaxpayerID":null,"AcctSourceCode":"","AcctReservationCodeDate":"","AcctReservationCode":"","AcctPurchaseOrderNo":null,"AcctNotifyMethod":1,"AcctLocaleCode":"DK-DANSK","AcctLanguageCode":null}},"AMPSEvent_AccountModified":null,"AMPSEvent_AccountCreated":null,"AMPSEvent_AccountCreditCardUpdated":null,"AMPSEvent_SubscriptionUpgraded":null}}')).to.equal(true);
  });



  it('enrichedEventData.eventPayLoad delivered to SQS', async () => {

    const payload = {
      "msgAuthDetails": {
          "userID": "abcd_user",
          "ariaAccountNo": 42046654,
          "ariaAccountID": null,
          "signatureVersion": 2,
          "signatureValue": "/FRhyjzWwMOdMrkdBFG2wXWKryJO6fkW+e8+U/SlO00=",
          "requestDateTime": "2019-10-12T23:35:16Z",
          "authKey": null,
          "clientNo": 25
      },
      "enrichedEventData": {
        "eventPayLoad": {
          "account": {
            "userid": "abcd_user",
            "senior_acct_no": null,
            "master_plan_instances": {
              "master_plan_instance_data": [
                {
                  "resp_plan_instance_no": null,
                  "resp_level_cd": "1",
                  "plan_instance_no": "130355225",
                  "client_plan_instance_id": "BER-C-COMBO-FULL-4dbbc68d-2694-4135-b044-ab7a0707cbea"
                }
              ]
            },
            "client_no": 90000327,
            "acct_no": 42046604
          },
          "request": {
            "version": 1,
            "transaction_id": 13,
            "sender": "A",
            "class": "T",
            "auth_key": "riweuyoruywe",
            "action": "M"
          },
          "posting_info": {
            "posting_user": "System",
            "posting_status_cd": 1,
            "posting_date": "2019-11-13 01:34:52"
          },
          "event_data": {
            "event": [
              {
                "event_label": "Invoice Created",
                "event_id": 901
              }
            ]
          }
        },
        "JSONGetAllInvoiceInfomationMReponse": {
          "error_code": 1016,
          "error_msg": "An input in the provided query is missing quotation marks around a string that includes a space, less than, greater than, or equals sign. Please add quotation marks to this input to receive the response you are expecting.",
          "starting_record": null,
          "total_records": null,
          "all_invoice_details_m": [],
          "SupplementalField1": null,
          "SupplementalField2": null,
          "SupplementalField3": null,
          "SupplementalField4": null,
          "SupplementalField5": null
        }
      }
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload });
    expect(response.statusCode).to.equal(200);

    expect(SQSSpy.deliver.calledWith(13, '{"account":{"userid":"abcd_user","senior_acct_no":null,"master_plan_instances":{"master_plan_instance_data":[{"resp_plan_instance_no":null,"resp_level_cd":"1","plan_instance_no":"130355225","client_plan_instance_id":"BER-C-COMBO-FULL-4dbbc68d-2694-4135-b044-ab7a0707cbea"}]},"client_no":90000327,"acct_no":42046604},"request":{"version":1,"transaction_id":13,"sender":"A","class":"T","auth_key":"riweuyoruywe","action":"M"},"posting_info":{"posting_user":"System","posting_status_cd":1,"posting_date":"2019-11-13 01:34:52"},"event_data":{"event":[{"event_label":"Invoice Created","event_id":901}]}}')).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(13, '{"eventPayLoad":{"account":{"userid":"abcd_user","senior_acct_no":null,"master_plan_instances":{"master_plan_instance_data":[{"resp_plan_instance_no":null,"resp_level_cd":"1","plan_instance_no":"130355225","client_plan_instance_id":"BER-C-COMBO-FULL-4dbbc68d-2694-4135-b044-ab7a0707cbea"}]},"client_no":90000327,"acct_no":42046604},"request":{"version":1,"transaction_id":13,"sender":"A","class":"T","auth_key":"riweuyoruywe","action":"M"},"posting_info":{"posting_user":"System","posting_status_cd":1,"posting_date":"2019-11-13 01:34:52"},"event_data":{"event":[{"event_label":"Invoice Created","event_id":901}]}},"JSONGetAllInvoiceInfomationMReponse":{"error_code":1016,"error_msg":"An input in the provided query is missing quotation marks around a string that includes a space, less than, greater than, or equals sign. Please add quotation marks to this input to receive the response you are expecting.","starting_record":null,"total_records":null,"all_invoice_details_m":[],"SupplementalField1":null,"SupplementalField2":null,"SupplementalField3":null,"SupplementalField4":null,"SupplementalField5":null}}')).to.equal(true);
  });


  it('enrichedEventData.eventPayload small l delivered to SQS', async () => {

    const payload = {
      "msgAuthDetails": {
          "userID": "abcd_user",
          "ariaAccountNo": 42046657,
          "ariaAccountID": null,
          "signatureVersion": 2,
          "signatureValue": "uUjqL18Mj3yAMpOpfDrDLwE1J2+1911nEIxHF5GkFTk=",
          "requestDateTime": "2019-10-12T23:35:16Z",
          "authKey": null,
          "clientNo": 25
      },
      "enrichedEventData": {
        "eventPayload": {
          "account": {
            "userid": "abcd_user",
            "senior_acct_no": null,
            "master_plan_instances": {
              "master_plan_instance_data": [
                {
                  "resp_plan_instance_no": null,
                  "resp_level_cd": "1",
                  "plan_instance_no": "130355226",
                  "client_plan_instance_id": "BER-C-COMBO-FULL-4dbbc68d-2694-4135-b044-ab7a0707cbea"
                }
              ]
            },
            "client_no": 90000327,
            "acct_no": 42046604
          },
          "request": {
            "version": 1,
            "transaction_id": 14,
            "sender": "A",
            "class": "T",
            "auth_key": "riwyuyoruywe",
            "action": "M"
          },
          "posting_info": {
            "posting_user": "System",
            "posting_status_cd": 1,
            "posting_date": "2019-11-13 01:34:52"
          },
          "event_data": {
            "event": [
              {
                "event_label": "Invoice Created",
                "event_id": 901
              }
            ]
          }
        },
        "JSONGetAllInvoiceInfomationMReponse": {
          "error_code": 1016,
          "error_msg": "An input in the provided query is missing quotation marks around a string that includes a space, less than, greater than, or equals sign. Please add quotation marks to this input to receive the response you are expecting.",
          "starting_record": null,
          "total_records": null,
          "all_invoice_details_m": [],
          "SupplementalField1": null,
          "SupplementalField2": null,
          "SupplementalField3": null,
          "SupplementalField4": null,
          "SupplementalField5": null
        }
      }
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload });
    expect(response.statusCode).to.equal(200);

    expect(SQSSpy.deliver.calledWith(14, '{"account":{"userid":"abcd_user","senior_acct_no":null,"master_plan_instances":{"master_plan_instance_data":[{"resp_plan_instance_no":null,"resp_level_cd":"1","plan_instance_no":"130355226","client_plan_instance_id":"BER-C-COMBO-FULL-4dbbc68d-2694-4135-b044-ab7a0707cbea"}]},"client_no":90000327,"acct_no":42046604},"request":{"version":1,"transaction_id":14,"sender":"A","class":"T","auth_key":"riwyuyoruywe","action":"M"},"posting_info":{"posting_user":"System","posting_status_cd":1,"posting_date":"2019-11-13 01:34:52"},"event_data":{"event":[{"event_label":"Invoice Created","event_id":901}]}}')).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(14, '{"eventPayload":{"account":{"userid":"abcd_user","senior_acct_no":null,"master_plan_instances":{"master_plan_instance_data":[{"resp_plan_instance_no":null,"resp_level_cd":"1","plan_instance_no":"130355226","client_plan_instance_id":"BER-C-COMBO-FULL-4dbbc68d-2694-4135-b044-ab7a0707cbea"}]},"client_no":90000327,"acct_no":42046604},"request":{"version":1,"transaction_id":14,"sender":"A","class":"T","auth_key":"riwyuyoruywe","action":"M"},"posting_info":{"posting_user":"System","posting_status_cd":1,"posting_date":"2019-11-13 01:34:52"},"event_data":{"event":[{"event_label":"Invoice Created","event_id":901}]}},"JSONGetAllInvoiceInfomationMReponse":{"error_code":1016,"error_msg":"An input in the provided query is missing quotation marks around a string that includes a space, less than, greater than, or equals sign. Please add quotation marks to this input to receive the response you are expecting.","starting_record":null,"total_records":null,"all_invoice_details_m":[],"SupplementalField1":null,"SupplementalField2":null,"SupplementalField3":null,"SupplementalField4":null,"SupplementalField5":null}}')).to.equal(true);
  });
});
