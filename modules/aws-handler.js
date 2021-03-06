
"use strict";

const AWS = require("aws-sdk");
var proxy = require("proxy-agent");
const { v4: uuidv4 } = require("uuid");

module.exports = class $AWS {
  dynamo;
  credentials;
  constructor(AccessKeyID, SecretAccessKey) {
    AWS.config.update({ httpOptions: { agent: this.proxy } });
    this.setCredentials(AccessKeyID, SecretAccessKey);
    this.initDynamo(this.credentials);
  }

  setCredentials(AccessKeyID, SecretAccessKey) {
    this.credentials = new AWS.Credentials(AccessKeyID, SecretAccessKey);
  }

  initDynamo(credentials) {
    this.dynamo = new AWS.DynamoDB.DocumentClient({
      credentials: credentials,
      region: "us-east-1",
    });
  }

  GetAllItems(tableName, callback) {
    let params = {
      TableName: tableName,
      Key: {},
    };
    this.dynamo.scan(params, callback);
  }

  GetItemByID(tableName, itemID, callback) {
    let params = {
      TableName: tableName,
      Key: {
        PrimaryKey: itemID,
      },
    };
    this.dynamo.get(params, (err, data) => {
      //Wrap callback function
      //Remaps the resulting object to match the GetAllItems return obj

      //If there's an error, we don't care about wrapping the data
      if (err) {
        callback(err, null)
        return
      } else {
        //Map Item -> Items and wrap single item in array
        Object.defineProperty(data, "Items",
          Object.getOwnPropertyDescriptor(data, "Item"));
        delete data["Item"];
        data['Items'] = [data['Items']]

        //Send the remapped data back into the callback
        callback(err, data);

      }
    });
  }

  GetItemByAttributeValues(tableName, attribute, queryArray, callback) {
    let expressions = generateSingleAttributeScanQuery(attribute, queryArray)
    let params = {
      TableName: tableName,
      FilterExpression: expressions.FilterExpression,
      ExpressionAttributeValues: expressions.ExpressionAttributeValues
    };
    this.dynamo.scan(params, callback);
  }

  GetItemByDifferentAttributes(tableName, values, callback) {


    let expressions = {};

    if (Object.keys(values).length == 2) {
      callback("'condition' key required if and only if you want to search more than one attribute", null);
      return
    } else if (Object.keys(values).length > 2) {
      if ('condition' in values) {
        if (values['condition'] != "and" && values['condition'] != 'or') {
          callback("Condition values can only be 'and' or 'or'!", null);
          return
        } else {
          let condition = values['condition']
          delete values['condition']
          expressions = generateMultiAttributeScanQuery(values, condition)
        }
      } else {
        callback("'condition' key required if and only if you want to search more than one attribute", null);
        return
      }

    } else {
      expressions = generateMultiAttributeScanQuery(values)
    }
    let params = {
      TableName: tableName,
      FilterExpression: expressions.FilterExpression,
      ExpressionAttributeValues: expressions.ExpressionAttributeValues
    };

    this.dynamo.scan(params, callback);

  }

  AddItem(tableName, itemContents, callback) {
    //Add the unique id to the item - overwrites it too if it exists for some reason (primary key should be unique for AddItem, is autogenerated as a uuid)
    let item = Object.assign(itemContents, { PrimaryKey: uuidv4() })
    let params = {
      TableName: tableName,
      Item: item,
      ReturnValues: "ALL_OLD",
      ConditionExpression: "attribute_not_exists(PrimaryKey)"
    };
    this.dynamo.put(params, callback);
  }

  ReplaceItem(tableName, itemContents, callback) {
    let params = {
      TableName: tableName,
      Item: itemContents,
      ReturnValues: "ALL_OLD",
      ConditionExpression: "attribute_exists(PrimaryKey)"
    };
    this.dynamo.put(params, callback);
  }

  UpdateItem(tableName, updatedValues, itemID, callback) {
    const PrimaryKey = itemID;
    //Make sure the primary key isn't in the values to change
    delete updatedValues.PrimaryKey;

    //Dynamically generate the expressions for updating
    let expressions = generateUpdateQuery(updatedValues);


    let params = {
      TableName: tableName,
      Key: {
        PrimaryKey: PrimaryKey,
      },
      UpdateExpression: expressions.UpdateExpression,
      ExpressionAttributeValues: expressions.ExpressionAttributeValues,
      ExpressionAttributeNames: expressions.ExpressionAttributeNames,
      ReturnValues: "UPDATED_NEW",
    };
    this.dynamo.update(params, callback);
  }

  DeleteItem(tableName, itemID, callback) {
    let params = {
      TableName: tableName,
      Key: {
        PrimaryKey: itemID,
      },
      ReturnValues: "ALL_OLD"

    };
    this.dynamo.delete(params, callback);
  }
};

//https://gist.github.com/daverickdunn/4c6a0f61a0b969ec59e589353138bdc3
const generateUpdateQuery = (fields) => {
  let exp = {
    UpdateExpression: 'set',
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  }
  Object.entries(fields).forEach(([key, item]) => {
    exp.UpdateExpression += ` #${key} = :${key},`;
    exp.ExpressionAttributeNames[`#${key}`] = key;
    exp.ExpressionAttributeValues[`:${key}`] = item
  })
  exp.UpdateExpression = exp.UpdateExpression.slice(0, -1);
  return exp
}


const generateMultiAttributeScanQuery = (fields, condition) => {
  let exp = {
    FilterExpression: '',
    ExpressionAttributeValues: {}
  }
  Object.entries(fields).forEach(([key, item]) => {
    if (condition) exp.FilterExpression += `${key} = :${key} ${condition} `
    else exp.FilterExpression += `${key} = :${key}`
    exp.ExpressionAttributeValues[`:${key}`] = item
  })
  if (condition) exp.FilterExpression = exp.FilterExpression.slice(0, -1 * (condition.length + 2));

  return exp
}

const generateSingleAttributeScanQuery = (attribute, arr) => {
  let exp = {
    FilterExpression: '',
    ExpressionAttributeValues: {}
  }
  if (arr.length > 1) {
    exp.FilterExpression = `${attribute} IN (`;
    for (var i = 0; i < arr.length; i++) {
      exp.FilterExpression += `:x${i}, `;
      exp.ExpressionAttributeValues[`:x${i}`] = arr[i];
    }
    exp.FilterExpression = exp.FilterExpression.slice(0, -2);
    exp.FilterExpression += ')';
  } else {
    exp.FilterExpression += `${attribute} = :x1`;
    exp.ExpressionAttributeValues[':x1'] = arr[0];
  }

  return exp
}