-- Flag pra forçar cobrança de insumos incluidoMensalidade / ração
-- (uso: insumo entregue na saída do animal do haras).

ALTER TABLE registros
  ADD COLUMN IF NOT EXISTS cobrar_avulso BOOLEAN DEFAULT FALSE;

UPDATE registros SET cobrar_avulso = FALSE WHERE cobrar_avulso IS NULL;
