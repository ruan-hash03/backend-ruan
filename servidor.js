const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = 3000;

app.use(express.json());

// CONEXÃO COM O BANCO
const db = new DatabaseSync('treinos.db');

// CRIAÇÃO DA TABELA
db.exec(`
    CREATE TABLE IF NOT EXISTS treinos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        duracao INTEGER NOT NULL
    )
`);

// 1. GET /treinos/total
app.get('/treinos/total', (req, res) => {
    const resultado = db.prepare(
        'SELECT COUNT(*) AS total FROM treinos'
    ).get();

    res.json(resultado);
});

// 2. GET /treinos/resumo
app.get('/treinos/resumo', (req, res) => {
    const resultado = db.prepare(`
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(duracao), 0) AS minutos,
            COALESCE(AVG(duracao), 0) AS media
        FROM treinos
    `).get();

    res.json(resultado);
});

// 3. GET /treinos
app.get('/treinos', (req, res) => {
    const { minimo, busca } = req.query;

    let sql = 'SELECT * FROM treinos WHERE 1=1';
    const valores = [];

    if (minimo !== undefined) {
        const numeroMinimo = Number(minimo);

        if (!Number.isFinite(numeroMinimo)) {
            return res.status(400).json({
                erro: 'Duração mínima inválida'
            });
        }

        sql += ' AND duracao >= ?';
        valores.push(numeroMinimo);
    }

    if (busca !== undefined) {
        sql += ' AND nome LIKE ?';
        valores.push(`%${busca}%`);
    }

    sql += ' ORDER BY duracao DESC';

    const treinos = db.prepare(sql).all(...valores);

    res.json(treinos);
});

// 4. POST /treinos
app.post('/treinos', (req, res) => {
    const { nome, duracao } = req.body;

    if (!nome || !duracao || typeof nome !== 'string' ||
        !Number.isInteger(duracao) || duracao <= 0) {
        return res.status(400).json({
            erro: 'Nome e duração são obrigatórios'
        });
    }

    const resultado = db.prepare(
        'INSERT INTO treinos (nome, duracao) VALUES (?, ?)'
    ).run(nome, duracao);

    const novoTreino = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(Number(resultado.lastInsertRowid));

    res.status(201).json(novoTreino);
});

// 5. GET /treinos/:id
app.get('/treinos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }

    const treino = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(id);

    if (!treino) {
        return res.status(404).json({
            erro: 'Treino não encontrado'
        });
    }

    res.json(treino);
});

// 6. PUT /treinos/:id
app.put('/treinos/:id', (req, res) => {
    const id = Number(req.params.id);
    const { nome, duracao } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }

    if (!nome || typeof nome !== 'string' ||
        !Number.isInteger(duracao) || duracao <= 0) {
        return res.status(400).json({
            erro: 'Nome e duração são obrigatórios'
        });
    }

    const resultado = db.prepare(
        'UPDATE treinos SET nome = ?, duracao = ? WHERE id = ?'
    ).run(nome, duracao, id);

    if (Number(resultado.changes) === 0) {
        return res.status(404).json({
            erro: 'Treino não encontrado'
        });
    }

    const treinoAtualizado = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(id);

    res.json(treinoAtualizado);
});

// 7. DELETE /treinos/:id
app.delete('/treinos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido'
        });
    }

    const resultado = db.prepare(
        'DELETE FROM treinos WHERE id = ?'
    ).run(id);

    if (Number(resultado.changes) === 0) {
        return res.status(404).json({
            erro: 'Treino não encontrado'
        });
    }

    res.status(204).send();
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
