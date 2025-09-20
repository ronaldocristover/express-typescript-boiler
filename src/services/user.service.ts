import userRepository from "../repositories/user.repository";

class UserService {
  async findAll() {
    return await userRepository.findAll();
  }

  async findOne(id: number) {
    return userRepository.findById(id);
  }

  async create(data: any) {
    return userRepository.create(data);
  }

  async update(id: number, data: any) {
    return userRepository.update(id, data);
  }

  async remove(id: number) {
    return userRepository.delete(id);
  }
}

export default new UserService();
