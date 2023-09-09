require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');

const app = express();
const port = 80;

const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});
app.get('/testdb', (req, res) => {
  connection.connect((err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados:', err);
      res.status(500).json({ error: 'Erro ao conectar ao banco de dados' });
      return;
    }
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    res.json({ message: 'Conexão com o banco de dados estabelecida com sucesso!' });
  });
});

// Rota para a API
app.get('/api/gold_customers', (req, res) => {
  const GOLD_VALUE = 100;

  const sql = `
    SELECT
        im.id_imovel,
        ti.categoria_imovel,
        im.desc_imovel,
        pag.valor_pagamento,
        pag.data_do_pagamento
    FROM
        imovel im
    LEFT JOIN
        tipo_imovel ti ON im.id_imovel = ti.id_imovel
    LEFT JOIN associacaopagamentos ap ON ap.id_imovel = im.id_imovel
    LEFT JOIN pagamento pag ON im.id_imovel = pag.id_imovel
  `;

  connection.query(sql, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Processar os resultados da consulta SQL
      const goldCustomers = calculateGoldCustomers(result, GOLD_VALUE);
      
      // Enviar os "gold customers" como resposta JSON
      res.status(200).json(goldCustomers);
    }
  });
});
function calculateGoldCustomers(results, goldValue) {
  const customerPayments = new Map();

  results.forEach((row) => {
    const customerId = row.id_imovel;
    const paymentAmount = row.valor_pagamento;

    if (!customerPayments.has(customerId)) {
      customerPayments.set(customerId, 0);
    }

    customerPayments.set(customerId, customerPayments.get(customerId) + paymentAmount);
  });

  const goldCustomers = Array.from(customerPayments.entries())
    .filter(([customerId, totalPayments]) => totalPayments > goldValue)
    .map(([customerId, totalPayments]) => ({
      id_imovel: customerId,
      total_pagamentos: totalPayments,
    }));

  return goldCustomers;
}

function groupSalesByMonthAndYear(pagamento) {
  const salesByMonthAndYear = {};

  // Percorre cada venda no array
  for (const sale of pagamento) {
    const date = new data_do_pagamento(pagamento.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Os meses em JavaScript são de 0 a 11

    // Cria uma chave no objeto salesByMonthAndYear no formato "YYYY-MM"
    const key = `${year}-${month.toString().padStart(2, '0')}`;

    // Se a chave não existe, cria um novo objeto para armazenar as vendas
    if (!salesByMonthAndYear[key]) {
      salesByMonthAndYear[key] = {
        year: year,
        month: month,
        totalSales: 0,
      };
    }

    // Adiciona o valor da venda ao total de vendas do mês/ano correspondente
    salesByMonthAndYear[key].totalSales += sale.amount;
  }

  // Converte o objeto em um array de resultados
  const result = Object.values(salesByMonthAndYear);

  return result;
}

// Chame a função e imprima o resultado
const monthlySales = groupSalesByMonthAndYear(pagamento);
console.log(monthlySales);


app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});
