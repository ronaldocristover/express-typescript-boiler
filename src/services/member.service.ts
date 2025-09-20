import groupRepository from "../repositories/group.repository";

class GroupService {
  async findAll() {
    return await groupRepository.findAll();
  }

  async findOne(id: number) {
    return groupRepository.findById(id);
  }

  async create(data: any) {
    return groupRepository.create(data);
  }

  async update(id: number, data: any) {
    return groupRepository.update(id, data);
  }

  async remove(id: number) {
    return groupRepository.delete(id);
  }
}

export default new GroupService();
