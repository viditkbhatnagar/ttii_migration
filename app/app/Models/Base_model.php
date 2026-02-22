<?php namespace App\Models;

use CodeIgniter\Model;

class Base_model extends Model
{
    // getResult() getResultArray() getRow() getRowArray() getCustomResultObject() getNumRows()
    // find() findAll() first()

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';
    protected $useSoftDeletes = true;
    
    protected $softDelete = true;
    protected $softDeleteField = 'deleted_at';

    protected $db;
    
    public function __construct(){
        $this->db = \Config\Database::connect();

        $this->softDeleteField = $this->table.'.deleted_at';
    }


    // public function get($where = null, $select = null, $order_by = null, $limit = null, $group_by = null){
    //     $query = $this->db->table($this->table);
    //     if ($select != null) {
    //         $query->select($select);
    //     }
    //     if ($where != null) {
    //         foreach ($where as $column => $value) {
    //             if (is_array($value)) {
    //                 // 'WHERE IN' condition
    //                 $query->whereIn($column, $value);
    //             } else {
    //                 // Normal 'WHERE' condition
    //                 $query->where($column, $value);
    //             }
    //         }
    //     }
    //     // Global soft delete condition
    //     if ($this->softDelete) {
    //         $query->where($this->softDeleteField . ' IS NULL');
    //     }
    //     if ($order_by != null) {
    //         foreach($order_by as $key => $direction){
    //             $query->orderBy($key, $direction);
    //         } 
    //     }
        
    //     if ($group_by != null) {
    //         $query->groupBy($group_by);
    //     }
    
    //     if ($limit != null) {
    //         $query->limit($limit);
    //     }
        
    //     return $query->get();
    // }
    public function get($where = null, $select = null, $order_by = null, $limit = null, $group_by = null)
    {
        $query = $this->db->table($this->table);
    
        if ($select != null) {
            $query->select($select);
        }
    
        if ($where != null) {
            foreach ($where as $column => $value) {
                // if ($column === 'OR' && is_array($value)) {
                //     // Handle OR conditions
                //     $query->groupStart(); // Open OR group
                //     foreach ($value as $orCol => $orVal) {
                //         if (is_array($orVal)) {
                //             $query->orWhereIn($orCol, $orVal);
                //         } else {
                //             $query->orWhere($orCol, $orVal);
                //         }
                //     }
                //     $query->groupEnd(); // Close OR group

                if ($column === 'OR' && is_array($value)) {
                    // Handle OR conditions (advanced support)
                    $query->groupStart(); 

                    foreach ($value as $orCol => $orVal) {

                        // CASE 1: OR with nested AND conditions (your chat case)
                        if (is_array($orVal) && isset($orVal['sender_id']) && isset($orVal['chat_id'])) {
                            $query->orGroupStart();
                            foreach ($orVal as $andCol => $andVal) {
                                $query->where($andCol, $andVal);
                            }
                            $query->groupEnd();
                        }

                        // CASE 2: Normal OR whereIn
                        elseif (is_array($orVal)) {
                            $query->orWhereIn($orCol, $orVal);
                        }

                        // CASE 3: Normal OR equals
                        else {
                            $query->orWhere($orCol, $orVal);
                        }
                    }

                    $query->groupEnd();

                } elseif (is_array($value)) {
                    if (strpos($column, ' NOT IN') !== false) {
                        $column = str_replace(' NOT IN', '', $column);
                        $query->whereNotIn($column, $value);
                    } else {
                        $query->whereIn($column, $value);
                    }
                } else {
                    $query->where($column, $value);
                }
            }
        }
    
        // Soft delete
        if ($this->softDelete) {
            $query->where($this->softDeleteField . ' IS NULL');
        }
    
        if ($order_by != null) {
            foreach($order_by as $key => $direction){
                $query->orderBy($key, $direction);
            }
        }
    
        if ($group_by != null) {
            $query->groupBy($group_by);
        }
    
        if ($limit != null) {
            $query->limit($limit);
        }
    
        return $query->get();
    }

    public function getNumRows($where = null, $group_by = null)
    {
        $query = $this->db->table($this->table);
    
        if ($where != null) {
            foreach ($where as $column => $value) {
                if (is_array($value)) {
                    // 'WHERE IN' condition
                    $query->whereIn($column, $value);
                } else {
                    // Normal 'WHERE' condition
                    $query->where($column, $value);
                }
            }
        }
    
        // Global soft delete condition
        if ($this->softDelete) {
            $query->where($this->softDeleteField . ' IS NULL');
        }
    
        if ($group_by != null) {
            $query->groupBy($group_by);
        }
    
        // Count the rows
        return $query->count();
    }


    public function get_array_column($where = null, $key = null, $value = null) {
        $query = $this->db->table($this->table);

        $columns = is_null($value) ? [$key] : [$key, $value];
        $query->select($columns);

        if ($where != null) {
            foreach ($where as $column => $value) {
                if (is_array($value)) {
                    // 'WHERE IN' condition
                    $query->whereIn($column, $value);
                } else {
                    // Normal 'WHERE' condition
                    $query->where($column, $value);
                }
            }
        }
        // Global soft delete condition
        if ($this->softDelete) {
            $query->where($this->softDeleteField . ' IS NULL');
        }

        $result = $query->get()->getResultArray();

        if (count($result) > 0) {
            return is_null($value) ? array_column($result, $key) : array_column($result, $value, $key);
        }

        return [];
    }




    // Enhanced join query function with multiple joins support
    public function get_join($joins, $where = [], $select = [], $order_by = null, $limit = null, $group_by = null)
    {
        $query = $this->db->table($this->table);
        if ($select != null) {
            $query->select($select);
        }
        foreach ($joins as $join) {
            $query->join($join[0], $join[1], $join[2] ?? 'left');
        }
        if ($where != null) {
            foreach ($where as $column => $value) {
                if (is_array($value)) {
                    // 'WHERE IN' condition
                    $query->whereIn($column, $value);
                } else {
                    // Normal 'WHERE' condition
                    $query->where($column, $value);
                }
            }
        }
        // Global soft delete condition
        if ($this->softDelete) {
            $query->where($this->softDeleteField . ' IS NULL');
            foreach ($joins as $join) {
                $query->where($join[0].'.deleted_at' . ' IS NULL');
            }
        }
        if ($order_by != null) {
            foreach($order_by as $key => $direction){
                $query->orderBy($key, $direction);
            } 
        }
        
        if ($group_by != null) {
            $query->groupBy($group_by);
        }
    
        if ($limit != null) {
            $query->limit($limit);
        }
        
        return $query->get();
    }

    // Custom function for paginated results
    public function paginate_data($per_page = 20, $group = 'default', $page = 1, array $select = [], array $where = [])
    {
        if (!empty($select)){
            $this->select($select);
        }
        if (!empty($where)) {
            $this->where($where);
        }
        return $this->paginate($per_page, $group, $page);
    }

    // Function to get a single record by a specific field
    public function find_value($field, $value)
    {
        return $this->where($field, $value)->first();
    }

    // Soft delete restoration method
    public function restore($id)
    {
        return $this->protect(false)->where('id', $id)->update($id, ['deleted_at' => null, 'deleted_by' => null]);
    }

    // Override save method for additional logic (e.g., logging)
    public function add($data)
    {
        $builder = $this->db->table($this->table);
        $result = $builder->insert($data);

        if ($result) {
            return $this->db->insertID();
        } else {
            return false;
        }
    }
    
    public function add_batch($data)
    {
        $builder = $this->db->table($this->table);
        $result = $builder->insertBatch($data);
    
        if ($result) {
            return true;
        } else {
            return false;
        }
    }
    

    public function edit($data, $where = null)
    {
        $builder = $this->db->table($this->table);

        $builder->set($data);

        if (!empty($where)){
            $builder->where($where);
        }

        $result = $builder->update();

        if ($result) {
            return true;
        } else {
            return false;
        }
    }

    public function remove($where = null, $remove_db = false)
    {
        if ($remove_db){
            return $this->remove($where);
        }

        $builder = $this->db->table($this->table);
        if (!empty($where)) {
            $builder->where($where);
        }
        $result = $builder->update(['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => get_user_id()]);
        return (bool) $result;
    }


    public function paginate_with_joins(array $joins, $per_page = 20, $group = 'default', $page = 1, array $select = [], array $where = [])
    {
        if (!empty($select)){
            $this->select($select);
        }

        foreach ($joins as $join) {
            $this->join($join['table'], $join['condition'], $join['type'] ?? 'left');
        }

        if (!empty($where)) {
            $this->where($where);
        }

        return $this->paginate($per_page, $group, $page);
    }

    public function password_hash($password){
        return password_hash($password, PASSWORD_DEFAULT);
    }
}
