import prisma from "../application/database";

class GroupRepository {
  private groupModel: any;

  constructor() {
    this.groupModel = prisma.group;
  }

  async findAll() {
    return this.groupModel.findMany({});
  }

  async findById(id: string) {
    return this.groupModel.findFirst({ where: { id } });
  }

  async create(data: any) {
    return this.groupModel.create({ data });
  }

  async update(id: string, data: any) {
    return this.groupModel.update({ where: { id }, data: data });
  }

  async delete(id: string) {
    return this.groupModel.delete({ where: { id: id } });
  }
}

export default new GroupRepository();
