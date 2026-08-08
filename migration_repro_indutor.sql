-- Marca insumos que são indutores de ovulação. Usados no CF do
-- caderno do repro (bloco "Induzir Ovulação" só lista insumos com
-- essa flag).

ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS indutor_ovulacao BOOLEAN DEFAULT FALSE;

UPDATE insumos SET indutor_ovulacao = FALSE WHERE indutor_ovulacao IS NULL;
