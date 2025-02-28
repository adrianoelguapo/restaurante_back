const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

require('dotenv').config();

const middlewares = require('./middlewares');

const app = express();

const url = process.env.MONGO_URI;
const client = new MongoClient(url);
client.connect()
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error de conexión:', err));
const db = client.db('restaurante');
const usersCollection = db.collection('usuarios');
const ordersCollection = db.collection('pedidos');
const tablesCollection = db.collection('mesas');
const foodCollection = db.collection('carta');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());

app.post('/api/login', async (req, res) => {
  const username = req.body['login-username'];
  const password = req.body['login-password'];

  try {
    const user = await usersCollection.findOne({ 
      usuario: username, 
      contraseña: password 
    });
    
    if (user) {
      let redirectUrl = "http://localhost/restaurante_front/home.html";
      if (username.toLowerCase() === "admin") {
        redirectUrl = "http://localhost/restaurante_front/admin.html";
      }
      res.status(200).json({
        message: "Login exitoso",
        redirectUrl: redirectUrl
      });
    } else {
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  } catch (error) {
    console.error("Error en el endpoint /api/login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.post('/api/signup', async (req, res) => {
  const username = req.body['signup-username'];
  const password = req.body['signup-password'];

  if (!username || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  try {
    const existingUser = await usersCollection.findOne({ usuario: username });
    if (existingUser) {
      return res.status(409).json({ error: "El nombre de usuario ya está ocupado." });
    }

    const newUser = {
      usuario: username,
      contraseña: password
    };
    
    await usersCollection.insertOne(newUser);
    res.status(201).json({ message: "Registro exitoso" });
  } catch (error) {
    console.error("Error en el endpoint /api/signup:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get('/api/carta', async (req, res) => {
  try {
    const dishes = await foodCollection.find().toArray();
    res.status(200).json(dishes);
  } catch (error) {
    console.error("Error en el endpoint /api/carta:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post('/api/order', async (req, res) => {
  const { nombre_solicitante, platos, preciototal } = req.body;
  
  if (!nombre_solicitante || !platos || !Array.isArray(platos) || platos.length === 0 || typeof preciototal !== 'number') {
    return res.status(400).json({ error: "Datos incompletos o inválidos para el pedido." });
  }
  
  try {
    const result = await ordersCollection.insertOne({
      nombre_solicitante,
      platos,
      preciototal
    });
    
    res.status(201).json({ 
      message: "Pedido enviado exitosamente.", 
      orderId: result.insertedId 
    });
  } catch (error) {
    console.error("Error en el endpoint /api/order:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get('/api/mesas', async (req, res) => {
  try {
    const mesas = await tablesCollection.find().toArray();
    res.status(200).json(mesas);
  } catch (error) {
    console.error("Error en el endpoint /api/mesas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post('/api/solicitar-mesa', async (req, res) => {
  console.log("Datos recibidos en /api/solicitar-mesa:", req.body);

  const { nombresolicitante, numeromesa } = req.body;

  if (!nombresolicitante || !numeromesa) {
      console.log("Solicitud rechazada: faltan datos.");
      return res.status(400).json({ error: "Faltan datos para la solicitud." });
  }

  try {
      const result = await db.collection('solicitudesmesa').insertOne({ nombresolicitante, numeromesa });
      console.log("Reserva almacenada con éxito:", result.insertedId);
      res.status(201).json({ message: "Reserva realizada con éxito.", requestId: result.insertedId });
  } catch (error) {
      console.error("Error en el endpoint /api/solicitar-mesa:", error);
      res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await ordersCollection.find().toArray();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error en el endpoint /api/orders:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.delete('/api/order/:id', async (req, res) => {
  try {
    const result = await ordersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 1) {
      res.status(200).json({ message: "Pedido eliminado exitosamente." });
    } else {
      res.status(404).json({ error: "Pedido no encontrado." });
    }
  } catch (error) {
    console.error("Error en el endpoint DELETE /api/order/:id:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.get('/api/table-requests', async (req, res) => {
  try {
      const tableRequests = await db.collection('solicitudesmesa').find().toArray();
      res.status(200).json(tableRequests);
  } catch (error) {
      console.error("Error en el endpoint /api/table-requests:", error);
      res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.delete('/api/table-request/:id', async (req, res) => {
  try {
      const result = await db.collection('solicitudesmesa').deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 1) {
          res.status(200).json({ message: "Solicitud de mesa eliminada exitosamente." });
      } else {
          res.status(404).json({ error: "Solicitud de mesa no encontrada." });
      }
  } catch (error) {
      console.error("Error en el endpoint DELETE /api/table-request/:id:", error);
      res.status(500).json({ error: "Error interno del servidor." });
  }
});


app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;