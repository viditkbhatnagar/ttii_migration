<?php namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use Faker\Factory;

class User_seeder extends Seeder
{
    public function run()
    {
        $faker = Factory::create();
        $db = \Config\Database::connect();

        for ($i = 0; $i < 50; $i++) { // Generate 50 users
            $data = [
                'name' => $faker->name,
                'email'    => $faker->email,
                'phone'    => $faker->phoneNumber,
                'dob'    => $faker->date,
                'jod'    => $faker->date,
                'password' => password_hash($faker->email, PASSWORD_DEFAULT)
            ];
            $db->table('users')->insert($data);
        }
    }
}
