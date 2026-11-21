import { Injectable } from "@nestjs/common";
import { carregarDados, MotorLatam } from "@betel/motor-latam";

/**
 * D59: motor de dano com os efeitos dos equipamentos (código e dados de adsonpleal/latam-ro-calc,
 * licença MIT). Os dados (cerca de 5 MB abertos) só são lidos na primeira simulação, para não
 * pesar na subida da API.
 */
@Injectable()
export class MotorService {
  private motor: MotorLatam | null = null;

  /** Devolve o motor, carregando os dados na primeira vez. */
  obter(): MotorLatam {
    this.motor ??= new MotorLatam(carregarDados());
    return this.motor;
  }
}
