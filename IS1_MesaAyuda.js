
/*-----------------------------------------------------------------------------------------------------------------
  MesaAyuda.js debe copiarse al directorio del proyecto express como index.js

  REST API 
  UADER - IS1
  Caso de estudio MesaAyuda

  Dr. Pedro E. Colla 2023,2025
 *----------------------------------------------------------------------------------------------------------------*/
//AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1

import express from 'express';
import crypto from 'crypto';
console.log("Comenzando servidor");

// const crypto = require('crypto');
console.log("crypto Ok!");

//const express = require('express');
//console.log("express Ok!");

const app = express();
console.log("express ready!");

const PORT = 8080;

import cors from 'cors';

//const cors = require('cors');
console.log("cors ok!");

app.use(cors());
console.log("cors ready!");

import AWS from 'aws-sdk'
//var AWS = require('aws-sdk');
console.log("aws-sdk ready!");

/*----
Acquire critical security resources from an external file out of the path
*/
//const accessKeyId = require('../accessKeyId.js');
//const secretAccessKey = require('../secretAccessKey.js');
import accessKeyId from '../accessKeyId.js';
import secretAccessKey from '../secretAccessKey.js';

let awsConfig = {
    "region": "us-east-1",
    "endpoint": "https://dynamodb.us-east-1.amazonaws.com",
    "accessKeyId": accessKeyId,
    "secretAccessKey": secretAccessKey
};

AWS.config.update(awsConfig);
console.log("Servidor listo!");
let docClient = new AWS.DynamoDB.DocumentClient();

app.listen(
    PORT,
    () => console.log(`Servidor listo en http://localhost:${PORT}`)
);

app.use(express.json());

app.get('/resumenTickets', manejarResumenTickets);
app.post('/resumenTickets', manejarResumenTickets);
app.get('/getTicket', manejarGetTicket);
app.post('/getTicket', manejarGetTicket);
app.post('/api/getTicket', manejarGetTicket);

app.get('/api/cliente', (req, res) => {
    res.status(200).send({ response: "OK", message: "API Ready" });
    console.log("API cliente: OK");
});

/*-----------
función para hacer el parse de un archivo JSON
*/
function jsonParser(keyValue, stringValue) {
    var string = JSON.stringify(stringValue);
    var objectValue = JSON.parse(string);
    return objectValue[keyValue];
}

function fechaActual() {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${hoy.getFullYear()}`;
}

async function autenticarCliente(id, password) {
    if (!id || !password) {
        return null;
    }

    const response = await docClient.get({
        TableName: "cliente",
        Key: { id }
    }).promise();

    let cliente = response && response.Item ? response.Item : null;
    if (!cliente) {
        const clientes = await scanDb(id);
        cliente = clientes[0] || null;
    }

    if (!cliente) {
        return null;
    }

    if (cliente.password !== password) {
        return null;
    }

    if (cliente.activo !== true) {
        return null;
    }

    return cliente;
}

async function scanTablaCompleta(nombreTabla) {
    const items = [];
    let lastEvaluatedKey;

    do {
        const response = await docClient.scan({
            TableName: nombreTabla,
            ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {})
        }).promise();
        items.push(...(response.Items || []));
        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
}

async function obtenerResumenTickets() {
    const [clientes, todosLosTickets] = await Promise.all([
        scanTablaCompleta("cliente"),
        scanTablaCompleta("ticket")
    ]);
    const ticketsPorCliente = new Map();

    for (const ticket of todosLosTickets) {
        const tickets = ticketsPorCliente.get(ticket.clienteID) || [];
        tickets.push({
            clave: ticket.id,
            fechaApertura: ticket.fecha_apertura || null,
            estado: ticket.estado_solucion !== undefined ? ticket.estado_solucion : null
        });
        ticketsPorCliente.set(ticket.clienteID, tickets);
    }

    return clientes.map(cliente => {
        const tickets = ticketsPorCliente.get(cliente.id) || [];
        return {
            id: cliente.id,
            correo: cliente.contacto || cliente.id,
            cantidadTickets: tickets.length,
            tickets
        };
    });
}

async function manejarResumenTickets(req, res) {
    const id = typeof req.query?.ID === 'string'
        ? req.query.ID.trim()
        : (typeof req.body?.ID === 'string' ? req.body.ID.trim() : "");
    const password = typeof req.query?.PASSWORD === 'string'
        ? req.query.PASSWORD
        : (typeof req.body?.PASSWORD === 'string' ? req.body.PASSWORD : "");

    if (!id || !password) {
        res.status(400).send({ response: "ERROR", message: "Debe suministrar ID y PASSWORD" });
        return;
    }

    try {
        const cliente = await autenticarCliente(id, password);
        if (!cliente) {
            res.status(401).send({ response: "ERROR", message: "Credenciales inválidas" });
            return;
        }

        const resumen = await obtenerResumenTickets();
        res.status(200).send({
            response: "OK",
            usuario: {
                id: cliente.id,
                correo: cliente.contacto || cliente.id
            },
            clientes: resumen
        });
    } catch (error) {
        console.error("resumenTickets: error al generar el resumen", error);
        res.status(500).send({ response: "ERROR", message: "Error al generar el resumen de tickets" });
    }
}
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST Cliente                                                            *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*


/*-----------
  /api/getCliente
  Esta API permite acceder a un cliente dado su id
*/
app.post('/api/getCliente/:id', (req, res) => {
    const { id } = req.params;
    console.log("getCliente: id(" + id + ")");
    var params = {
        TableName: "cliente",
        Key: {
            "id": id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
        }
    };
    docClient.get(params, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB access error " + null }));
        } else {

            if (Object.keys(data).length != 0) {
                res.status(200).send(JSON.stringify({ "response": "OK", "cliente": data.Item }), null, 2);
            } else {
                res.status(400).send(JSON.stringify({ "response": "ERROR", message: "Cliente no existe" }), null, 2);
            }
        }
    })


});

/*---
  /api/loginCliente
  Esta API permite acceder a un cliente por contacto y comparar la password pasada en un JSON en el cuerpo con la indicada en el DB
*/
app.post('/api/loginCliente', (req, res) => {

    const contacto = typeof req.body.contacto === "string" ? req.body.contacto.trim() : "";
    const { password } = req.body;

    console.log("loginCliente: autenticación por contacto");

    if (!password) {
        res.status(401).send({ response: "invalido" });
        return;
    }
    if (!contacto) {
        res.status(401).send({ response: "invalido" });
        return;
    }

    scanDb(contacto)
        .then(async clientes => {
            if (clientes.length === 0) {
                res.status(401).send({ response: "invalido" });
                return;
            }

            const cliente = clientes[0];
            const paswd = jsonParser('password', cliente);
            const activo = jsonParser('activo', cliente);
            if (password !== paswd) {
                res.status(401).send({ response: "invalido" });
                return;
            }
            if (activo !== true) {
                res.status(401).send({ response: "invalido" });
                return;
            }

            const id = jsonParser('id', cliente);
            const nombre = jsonParser('nombre', cliente);
            const contactoCliente = jsonParser('contacto', cliente);
            const fecha_ultimo_ingreso = jsonParser('fecha_ultimo_ingreso', cliente);
            res.status(200).send({
                response: "OK",
                id,
                nombre,
                contacto: contactoCliente,
                fecha_ultimo_ingreso
            });
        })
        .catch(error => {
            console.error("loginCliente: error al consultar cliente", error);
            res.status(500).send({ response: "ERROR", message: "Error al consultar el cliente" });
        });

});

app.post('/api/checkCliente', async (req, res) => {
    const contacto = typeof req.body.contacto === "string" ? req.body.contacto.trim() : "";
    if (!contacto) {
        res.status(400).send({ response: "ERROR", message: "Correo electrónico no informado" });
        return;
    }

    try {
        const clientes = await scanDb(contacto);
        res.status(200).send({ response: "OK", exists: clientes.length > 0 });
    } catch (error) {
        console.error("checkCliente: error al consultar cliente", error);
        res.status(500).send({ response: "ERROR", message: "Error al verificar el correo" });
    }
});

app.post('/api/registrarCliente', async (req, res) => {
    const contacto = typeof req.body.contacto === "string" ? req.body.contacto.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const termsAccepted = req.body.termscondition === true;

    if (!contacto || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto)) {
        res.status(400).send({ response: "ERROR", message: "Correo electrónico inválido" });
        return;
    }
    if (!password) {
        res.status(400).send({ response: "ERROR", message: "Password no informada" });
        return;
    }
    if (!termsAccepted) {
        res.status(400).send({ response: "ERROR", message: "Debe aceptar los términos y condiciones" });
        return;
    }

    try {
        const clientes = await scanDb(contacto);
        if (clientes.length > 0) {
            res.status(409).send({ response: "ERROR", message: "Cliente ya existe" });
            return;
        }

        const hoy = fechaActual();
        const nuevoCliente = {
            id: contacto,
            contacto,
            password,
            activo: true,
            registrado: true,
            primer_ingreso: false,
            fecha_alta: hoy,
            fecha_cambio_password: hoy,
            fecha_ultimo_ingreso: hoy
        };
        await docClient.put({
            TableName: "cliente",
            Item: nuevoCliente,
            ConditionExpression: 'attribute_not_exists(id)'
        }).promise();

        const { password: _password, ...clienteRegistrado } = nuevoCliente;
        res.status(201).send({ response: "OK", cliente: clienteRegistrado });
    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            res.status(409).send({ response: "ERROR", message: "Cliente ya existe" });
            return;
        }
        console.error("registrarCliente: error al dar de alta cliente", error);
        res.status(500).send({ response: "ERROR", message: "Error al registrar el cliente" });
    }
});

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDb(contacto) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const paramsScan = {
        TableName: "cliente",
        FilterExpression: "#contacto = :contacto",
        ExpressionAttributeNames: { "#contacto": "contacto" },
        ExpressionAttributeValues: { ":contacto": contacto }
    };
    const items = [];
    let lastEvaluatedKey;
    do {
        const data = await docClient.scan({
            ...paramsScan,
            ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {})
        }).promise();
        items.push(...data.Items);
        lastEvaluatedKey = data.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items;
}

/*----
addCliente
Revisa si el contacto (e-mail) existe y en caso que no da de alta el cliente generando un id al azar
*/
app.post('/api/addCliente', (req, res) => {

    const { contacto } = req.body;
    const { password } = req.body;
    const { nombre } = req.body;
    console.log("addCliente: contacto(" + contacto + ") nombre(" + nombre + ") password(" + password + ")");

    if (!password) {
        res.status(400).send({ response: "ERROR", message: "Password no informada" });
        return;
    }
    if (!nombre) {
        res.status(400).send({ response: "ERROR", message: "Nombre no informado" });
        return;
    }

    if (!contacto) {
        res.status(400).send({ response: "ERROR", message: "Contacto no informado" });
        return;
    }

    scanDb(contacto)
        .then(resultDb => {
            if (Object.keys(resultDb).length != 0) {
                res.status(400).send({ response: "ERROR", message: "Cliente ya existe" });
                return;
            } else {
                var hoy = new Date();
                var dd = String(hoy.getDate()).padStart(2, '0');
                var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
                var yyyy = hoy.getFullYear();
                hoy = dd + '/' + mm + '/' + yyyy;

                const newCliente = {
                    id: contacto,
                    nombre: nombre,
                    password: password,
                    activo: true,
                    registrado: true,
                    primer_ingreso: false,
                    fecha_alta: hoy,
                    fecha_cambio_password: hoy,
                    fecha_ultimo_ingreso: hoy,
                };

                const paramsPut = {
                    TableName: "cliente",
                    Item: newCliente,
                    ConditionExpression: 'attribute_not_exists(id)',
                };

                docClient.put(paramsPut, function (err, data) {
                    if (err) {
                        res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB error" + err }));
                    } else {
                        res.status(200).send(JSON.stringify({ response: "OK", "cliente": newCliente }));
                    }
                });
            }
        });

});
/*----------
/api/updateCliente
Permite actualizar datos del cliente contacto, nombre, estado de activo y registrado
*/
app.post('/api/updateCliente', (req, res) => {

    const { id } = req.body;
    const { nombre } = req.body;
    const { password } = req.body;

    var activo = ((req.body.activo + '').toLowerCase() === 'true')
    var registrado = ((req.body.registrado + '').toLowerCase() === 'true')

    console.log("updateCliente: id(" + id + ") nombre(" + nombre + ") password(" + password + ") activo(" + activo + ") registrado(" + registrado + ")");

    if (!id) {
        res.status(400).send({ response: "ERROR", message: "Id no informada" });
        return;
    }

    if (!nombre) {
        res.status(400).send({ response: "ERROR", message: "Nombre no informado" });
        return;
    }

    if (!password) {
        res.status(400).send({ response: "ERROR", message: "Password no informado" });
        return;
    }

    var params = {
        TableName: "cliente",
        Key: {
            "id": id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
        }
    };

    docClient.get(params, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB access error " + null }));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({ "response": "ERROR", message: "Cliente no existe" }), null, 2);
                return;
            } else {

                const paramsUpdate = {

                    ExpressionAttributeNames: {
                        "#a": "activo",
                        "#n": "nombre",
                        "#p": "password",
                        "#r": "registrado"

                    },
                    ExpressionAttributeValues: {
                        ":a": activo,
                        ":p": password,
                        ":n": nombre,
                        ":r": registrado
                    },
                    Key: {
                        "id": id
                    },
                    ReturnValues: "ALL_NEW",
                    TableName: "cliente",
                    UpdateExpression: "SET #n = :n, #p = :p, #a = :a, #r = :r"
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err) {
                        res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB access error " + err }));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({ response: "OK", message: "updated", "data": data }));
                    }
                });
            }
        }
    })


});
/*-------
/api/resetCliente
Permite cambiar la password de un cliente
*/
app.post('/api/resetCliente', async (req, res) => {
    const id = typeof req.body.id === "string" ? req.body.id.trim() : "";
    const contacto = typeof req.body.contacto === "string" ? req.body.contacto.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const confirmPassword = req.body.confirmPassword;

    if (!id && !contacto) {
        res.status(400).send({ response: "ERROR", message: "Debe informar el id o correo electrónico del cliente" });
        return;
    }
    if (!password) {
        res.status(400).send({ response: "ERROR", message: "Password no informada" });
        return;
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
        res.status(400).send({ response: "ERROR", message: "Las contraseñas no coinciden" });
        return;
    }

    try {
        let cliente;
        if (contacto) {
            const clientes = await scanDb(contacto);
            cliente = clientes[0];
        } else {
            const response = await docClient.get({
                TableName: "cliente",
                Key: { id }
            }).promise();
            cliente = response.Item;
        }

        if (!cliente) {
            res.status(404).send({ response: "ERROR", message: "Cliente no existe" });
            return;
        }

        const hoy = fechaActual();
        await docClient.update({
            TableName: "cliente",
            Key: { id: cliente.id },
            ExpressionAttributeNames: {
                "#p": "password",
                "#f": "fecha_cambio_password"
            },
            ExpressionAttributeValues: {
                ":p": password,
                ":f": hoy
            },
            UpdateExpression: "SET #p = :p, #f = :f"
        }).promise();

        res.status(200).send({ response: "OK", message: "updated" });
    } catch (error) {
        console.error("resetCliente: error al actualizar contraseña", error);
        res.status(500).send({ response: "ERROR", message: "Error al actualizar la contraseña" });
    }
});
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST ticket                                                             *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDbTicket(clienteID) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey = clienteID;
    const paramsScan = { // ScanInput
        TableName: "ticket", // required
        Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
        FilterExpression: 'clienteID = :clienteID',
        ExpressionAttributeValues: { ':clienteID': scanKey }
    };
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
        return data.Items
    });
    return objectPromise;
}
/*----------
  listarTicket
  API REST para obtener todos los tickets de un clienteID
*/
app.post('/api/listarTicket', (req, res) => {

    const { clienteID } = req.body;
    console.log("listarTicket: clienteID(" + clienteID + ")");

    if (!clienteID) {
        res.status(400).send({ response: "ERROR", message: "clienteID no informada" });
        return;
    }

    scanDbTicket(clienteID)
        .then(resultDb => {
            if (Object.keys(resultDb).length == 0) {
                res.status(400).send({ response: "ERROR", message: "clienteID no tiene tickets" });
                return;
            } else {
                res.status(200).send(JSON.stringify({ response: "OK", "data": resultDb }));
            }

        });

});

/*---------
  getTicket
  API REST autenticada para obtener los detalles de un ticket
*/
async function manejarGetTicket(req, res) {
    const id = typeof req.query?.ID === 'string'
        ? req.query.ID.trim()
        : (typeof req.body?.ID === 'string' ? req.body.ID.trim() : "");
    const password = typeof req.query?.PASSWORD === 'string'
        ? req.query.PASSWORD
        : (typeof req.body?.PASSWORD === 'string' ? req.body.PASSWORD : "");
    const ticketID = typeof req.query?.TICKET === 'string'
        ? req.query.TICKET.trim()
        : (typeof req.body?.TICKET === 'string' ? req.body.TICKET.trim() : "");

    if (!id || !password || !ticketID) {
        res.status(400).send({
            response: "ERROR",
            message: "Debe suministrar ID, PASSWORD y TICKET"
        });
        return;
    }

    try {
        const cliente = await autenticarCliente(id, password);
        if (!cliente) {
            res.status(401).send({ response: "ERROR", message: "Credenciales inválidas" });
            return;
        }

        const ticketResponse = await docClient.get({
            TableName: "ticket",
            Key: { id: ticketID }
        }).promise();
        const ticket = ticketResponse && ticketResponse.Item ? ticketResponse.Item : null;

        if (!ticket) {
            res.status(404).send({ response: "ERROR", message: "Ticket no existe" });
            return;
        }

        if (ticket.clienteID !== cliente.id) {
            res.status(404).send({ response: "ERROR", message: "Ticket no existe para este cliente" });
            return;
        }

        res.status(200).send({
            response: "OK",
            cliente: {
                id: cliente.id,
                correo: cliente.contacto || cliente.id
            },
            ticket
        });
    } catch (error) {
        console.error("getTicket: error al consultar el ticket", error);
        res.status(500).send({ response: "ERROR", message: "Error al consultar el ticket" });
    }
}

/*-----------------
/api/addTicket
API REST para agregar ticket (genera id)
*/
app.post('/api/addTicket', (req, res) => {

    const { clienteID } = req.body;
    const estado_solucion = 1;
    const { solucion } = req.body;
    const { descripcion } = req.body;

    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const newTicket = {
        id: crypto.randomUUID(),
        clienteID: clienteID,
        estado_solucion: estado_solucion,
        solucion: solucion,
        descripcion: descripcion,
        fecha_apertura: hoy,
        ultimo_contacto: hoy
    };

    const paramsPut = {
        TableName: "ticket",
        Item: newTicket,
        ConditionExpression: 'attribute_not_exists(id)',
    };

    docClient.put(paramsPut, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB error" + err }));
        } else {
            res.status(200).send(JSON.stringify({ response: "OK", "ticket": newTicket }));
        }
    });
}
)

/*--------
/api/updateTicket
Dado un id actualiza el ticket, debe informarse la totalidad del ticket excepto ultimo_contacto
*/
app.post('/api/updateTicket', (req, res) => {

    const { id } = req.body;
    const { clienteID } = req.body;
    const { estado_solucion } = req.body;
    const { solucion } = req.body;
    const { descripcion } = req.body;
    const { fecha_apertura } = req.body;

    if (!id) {
        res.status(400).send({ response: "ERROR", message: "Id no informada" });
        return;
    }

    if (!clienteID) {
        res.status(400).send({ response: "ERROR", message: "clienteID no informada" });
        return;
    }

    if (!estado_solucion) {
        res.status(400).send({ response: "ERROR", message: "estado_solucion no informada" });
        return;
    }

    if (!solucion) {
        res.status(400).send({ response: "ERROR", message: "solucion no informado" });
        return;
    }

    if (!fecha_apertura) {
        res.status(400).send({ response: "ERROR", message: "fecha apertura" });
        return;
    }

    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const ultimo_contacto = hoy;

    var params = {
        TableName: "ticket",
        Key: {
            "id": id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
        }
    };

    docClient.get(params, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB access error " + null }));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({ "response": "ERROR", message: "ticket no existe" }), null, 2);
                return;
            } else {

                const paramsUpdate = {

                    ExpressionAttributeNames: {
                        "#c": "clienteID",
                        "#e": "estado_solucion",
                        "#s": "solucion",
                        "#a": "fecha_apertura",
                        "#u": "ultimo_contacto",
                        "#d": "descripcion"
                    },
                    ExpressionAttributeValues: {
                        ":c": clienteID,
                        ":e": estado_solucion,
                        ":s": solucion,
                        ":a": fecha_apertura,
                        ":u": ultimo_contacto,
                        ":d": descripcion
                    },
                    Key: {
                        "id": id
                    },
                    ReturnValues: "ALL_NEW",
                    TableName: "ticket",
                    UpdateExpression: "SET #c = :c, #e = :e, #a = :a, #s = :s, #d = :d, #u = :u"
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err) {
                        res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB access error " + err }));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({ response: "OK", "data": data }));
                    }
                });
            }
        }
    })

});
/*-------------------------------------------------[ Fin del API REST ]-------------------------------------------------------------*/
