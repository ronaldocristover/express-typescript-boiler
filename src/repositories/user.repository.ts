import prisma from "../application/database";

class UserRepository {
  private userModel: any;

  constructor() {
    this.userModel = prisma.user;
  }

  async findAll() {
    return this.userModel.findMany({});
  }

  async findById(id: number) {
    return this.userModel.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.userModel.create({ data });
  }

  async update(id: number, data: any) {
    return this.userModel.update({ where: { id }, data: data });
  }

  async delete(id: number) {
    return this.userModel.delete({ where: { id } });
  }
}

export default new UserRepository();
