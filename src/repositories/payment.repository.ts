import prisma from "../application/database";

class PaymentRepository {
  private paymentModel: any;

  constructor() {
    this.paymentModel = prisma.groupEventPayment;
  }

  async findAll() {
    return this.paymentModel.findMany({
      include: {
        user: true,
        group_event: true,
      },
    });
  }

  async findById(id: number) {
    return this.paymentModel.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.paymentModel.create({ data });
  }

  async update(id: number, data: any) {
    return this.paymentModel.update({ where: { id }, data: data });
  }

  async delete(id: number) {
    return this.paymentModel.delete({ where: { id } });
  }
}

export default new PaymentRepository();
