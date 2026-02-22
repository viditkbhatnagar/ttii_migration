<?php

namespace App\Controllers\Admin;

use App\Models\Users_model;
use App\Models\Country_model;
use App\Models\Course_model;
use App\Models\Subjects_model;
use App\Models\Student_fee_model;
use App\Models\Enrol_model;
use DateTime;

class Fee_management extends AppBaseController
{
    private $users_model;
    private $country_model;
    private $course_model;
    private $subjects_model;
    private $students_model;
    private $university_model;
    private $student_fee_model;
    private $specialisation_model;
    private $enrol_model;

    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->country_model = new Country_model();
        $this->course_model = new Course_model();
        $this->student_fee_model = new Student_fee_model();
        $this->enrol_model = new Enrol_model();
    }

    public function installments()
    {
        $where = ['users.role_id' => 2];

        if ($this->request->getGet('student_id') != null) {
            $where += [
                'student_payments.user_id' => $this->request->getGet('student_id')
            ];
        }

        if ($this->request->getGet('payment_status') != null) {
            $where += [
                'student_payments.status' => $this->request->getGet('payment_status')
            ];
        }


        if ($this->request->getGet('course_id') != null) {
            $where += [
                'student_payments.course_id' => $this->request->getGet('course_id')
            ];
        }


      
        $this->data['students'] = $this->student_fee_model->get_join(
        [
        	['users', 'users.id = student_payments.user_id'],
        ],
            $where,
            [' student_payments.*','student_payments.status as payment_status', 'users.name as student','users.student_id','users.*'],['student_payments.created_at' => 'desc'],null,['users.id']
        )->getResultArray();

        $added_count = 0;
        $partial_count = 0;
        $not_added_count = 0;

        foreach ($this->data['students'] as &$student) {

            // Get specialisation total amount (this is the correct course fee)
            $courses = $this->course_model->get_join([['enrol', 'enrol.course_id = course.id']],['enrol.user_id' => $student['id']])->getResultArray();

            if (!empty($courses)) {

                $total_after_discount = 0;
                $course_names = [];

                foreach ($courses as $c) {
                    $price = (float)$c['total_amount'];
                    $discount = !empty($c['discount_perc']) ? (float)$c['discount_perc'] : 0;

                    // apply discount
                    $discounted_price = $price - ($price * ($discount / 100));

                    $total_after_discount += $discounted_price;
                    $course_names[] = $c['title'];
                }

                $student['total_course_amount'] = $total_after_discount;
                $student['course_names'] = $course_names;

            } else {
                $student['total_course_amount'] = 0;
                $student['course_names'] = [];
            }
            

            //log_message('error', json_encode($student['course_names'], true));
            // Get all paid installments for this student
            $installments = $this->student_fee_model->get(['user_id' => $student['id']])->getResultArray();

            // Calculate total paid amount (only count 'Paid' status payments)
            $added_amount = 0;
            foreach ($installments as $installment) {
                // if (strtolower($installment['status']) === 'paid') {
                $added_amount += $installment['amount'];
                // }
            }

            $total_course_amount = $student['total_course_amount'];
            $not_added_amount = $total_course_amount - $added_amount;

            // Determine installment status
            if ($added_amount == 0) {
                $student['installment_status'] = 'not_added';
                $not_added_count++;
            } else if ($added_amount >= $total_course_amount) {
                $student['installment_status'] = 'added';
                $added_count++;
            } else {
                $student['installment_status'] = 'partially_added';
                $partial_count++;
            }
        }

        if ($status = $this->request->getGet('list_by')) {
            $validStatuses = ['added', 'partially_added', 'not_added'];

            if (in_array($status, $validStatuses)) {
                $this->data['students'] = array_filter($this->data['students'], fn($stud) => $stud['installment_status'] === $status);
            }
        }



        // echo "<pre>"; print_r($this->data['students']); exit;
        $this->data['added_count'] = $added_count;
        $this->data['not_added_count'] = $not_added_count;
        $this->data['partial_count'] = $partial_count;

        $this->data['courses'] = $this->course_model->get()->getResultArray();
        $this->data['students_list'] = $this->users_model->get(['role_id' => 2], ['id', 'name', 'student_id'], ['created_at' => 'desc'])->getResultArray();

        $this->data['page_title'] = 'Fee Installmets';
        $this->data['page_name'] = 'Fee_management/installments';

        return view('Admin/index', $this->data);
    }

    public function manage_installmets($student_id)
    {
        $filter = [];
        $filter = ['users.id' => $student_id];


        $where = ['student_payments.user_id' => $student_id];
        if ($this->request->getGet('course_id') != null) {
            $where += [
                'student_payments.course_id' => $this->request->getGet('course_id')
            ];

            $filter += ['course.id' => $this->request->getGet('course_id')];
        }

        if ($this->request->getGet('payment_status') != null) {
            $where += [
                'student_payments.status' => $this->request->getGet('payment_status')
            ];

        }


        
        
        // $courses = $this->enrol_model->get_join(
        //     [['enrol', 'enrol.user_id = users.id'],,
        //     $filter,
        //     ['course.id','course.total_amount','course.title']
        // )->getResultArray();

        $courses = $this->enrol_model->get_join(
            [['users', 'enrol.user_id = users.id'],['course', 'enrol.course_id = course.id']],
            $filter,
            ['course.id','course.total_amount','course.title','enrol.discount_perc']
        )->getResultArray();

        $total_after_discount = 0;
        foreach ($courses as $c) {
            
            $price = (float)$c['total_amount'];
            $discount = !empty($c['discount_perc']) ? (float)$c['discount_perc'] : 0;

            // apply discount
            $discounted_price = $price - ($price * ($discount / 100));

            $total_after_discount += $discounted_price;
            log_message('error', json_encode($total_after_discount, true));
        }
        
        

        $total_course_amount = $total_after_discount;
        // $total_course_amount = array_sum(array_column($courses, 'total_amount'));
        
        

        $this->data['list_items'] = $this->student_fee_model->get_join([['course', 'course.id = student_payments.course_id']], $where,['student_payments.*','course.title as course_name'])->getResultArray();

        $this->data['total_course_amount'] = $total_course_amount;
        $this->data['primary_course_name'] = $course['title'] ?? '';
        $this->data['added_amount'] = array_sum(array_column($this->data['list_items'], 'amount'));
        $this->data['not_added_amount'] = $this->data['total_course_amount'] - $this->data['added_amount'];
        $this->data['student_id'] = $student_id;

        $this->data['courses'] = $this->course_model->get_join([['enrol', 'enrol.course_id = course.id']],['enrol.user_id' => $student_id],['course.id','course.title'])->getResultArray();
        //  echo "<pre>"; print_r($this->data['list_items']); exit;
        $this->data['page_title'] = 'Installments';
        $this->data['page_name'] = 'Installments/index';

        return view('Admin/index', $this->data);
    }

    public function add_installment($student_id, $course_id = null)
    {
        if ($this->request->getMethod() === 'post') {
            $amount = $this->request->getPost('amount');

            // Get specialisation total amount
            $course = $this->course_model->get(['id' => $this->request->getPost('course_id')])->getRowArray() ?? [];
            $total_course_amount = $course ? $course['total_amount'] : 0;

            // Get existing payments
            $payments = $this->student_fee_model->get(['user_id' => $student_id,'course_id' => $this->request->getPost('course_id')])->getResultArray();
            $total_payment = 0;
            if (!empty($payments)) {
                foreach ($payments as $payment) {
                    // if ($payment['status'] === 'Paid') {
                    $total_payment += $payment['amount'];
                    // }
                }
            }

            $total_payment = array_sum(array_column($payments, 'amount'));

            // Check if amount exceeds
            if (($total_payment + $amount) > $total_course_amount) {
                session()->setFlashdata('message_danger', "Amount exceeds the total course amount. Already paid amount: " . $total_payment . ". Total course amount: " . $total_course_amount);
            } else {
                $data = [
                    'user_id' => $student_id,
                    'course_id' => $this->request->getPost('course_id'),
                    'installment_details' => $this->request->getPost('installment_details'),
                    'amount' => $amount,
                    'due_date' => $this->request->getPost('due_date'),
                    'paid_date' => $this->request->getPost('payment_date'),
                    'payment_mode' => $this->request->getPost('payment_mode'),
                    'payment_to' => $this->request->getPost('payment_to'),
                    'status' => $this->request->getPost('status'),
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];

                $response = $this->student_fee_model->add($data);
                if ($response) {
                    session()->setFlashdata('message_success', "Payment Added Successfully!");
                } else {
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }

            return redirect()->to(base_url('admin/fee_management/manage_installmets/' . $student_id));

        } else {
            $course = $this->users_model->get_join(
                [['course', 'course.id = users.course_id']],
                ['users.id' => $student_id]
            )->getRowArray();

            $total_course_amount = $course['total_amount'] ?? 0;

            $list_items = $this->student_fee_model->get(['user_id' => $student_id])->getResultArray();
            $this->data['courses'] = $this->course_model->get_join(
            [
                ['enrol', 'enrol.course_id = course.id']
            ],['enrol.user_id' => $student_id],['course.id','course.title'])->getResultArray();

            $this->data['total_course_amount'] = $total_course_amount;
            $this->data['added_amount'] = array_sum(array_column($list_items, 'amount'));
            $this->data['not_added_amount'] = $this->data['total_course_amount'] - $this->data['added_amount'];
            $this->data['student_id'] = $student_id;
            $this->data['course_id'] = $course['id'];

            echo view('Admin/Installments/ajax_add', $this->data);
        }
    }


    public function edit_installment($installment_id)
    {

        if ($this->request->getMethod() === 'post') {

        } else {
            $this->data['edit_data'] = $this->installment_model->get(['id' => $installment_id])->getRowArray();

            $total_course_amount = array_sum(array_column(
                $this->data['specialisations'] = $this->course_model->get_join(
                    [['specialisations', 'specialisations.course_id = course.id']],
                    ['course.id' => $this->data['edit_data']['course_id']],
                    ['specialisations.fee_structure', 'specialisations.total_amount']
                )->getResultArray(),
                'total_amount'
            ));

            $list_items = $this->installment_model->get(['student_id' => $this->data['edit_data']['student_id'], 'id !=' => $installment_id])->getResultArray();
            $this->data['total_course_amount'] = $total_course_amount;
            $this->data['added_amount'] = array_sum(array_column($list_items, 'installment_amount'));
            $this->data['not_added_amount'] = $this->data['total_course_amount'] - $this->data['added_amount'];

            echo view('App/Installments/ajax_edit', $this->data);
        }
    }

    public function course_fee()
    {
        $where = ['users.role_id' => 4];

        if ($this->request->getGet('admission_status') != null) {
            $where += [
                'students.admission_status' => (int) $this->request->getGet('admission_status')
            ];
        }

        if ($this->request->getGet('list_admission_status') != null) {
            $where += [
                'students.admission_status' => (int) $this->request->getGet('list_admission_status')
            ];
        }

        if ($this->request->getGet('client_id') != null) {
            $where += [
                'students.referred_by' => (int) $this->request->getGet('client_id')
            ];
        }

        if ($this->request->getGet('university_id') != null) {
            $where += [
                'users.university_id' => $this->request->getGet('university_id')
            ];
        }

        if ($this->request->getGet('course_id') != null) {
            $where += [
                'students.course_id' => $this->request->getGet('course_id')
            ];
        }

        if ($this->request->getGet('consultant_id') != null) {
            $where += [
                'students.consultant_id' => $this->request->getGet('consultant_id')
            ];
        }

        if ($this->request->getGet('source') != null) {
            $where += [
                'students.source' => $this->request->getGet('source')
            ];
        }

        $this->data['students'] = $this->users_model->get_join(
            [
                ['students', 'students.student_id = users.id'],
                ['users as clients', 'students.referred_by = clients.id', 'left'],
                ['university', 'university.id = users.university_id'],
                ['course', 'course.id = students.course_id'],
                ['users as consultants', 'students.consultant_id = consultants.id'],
                ['sessions', 'sessions.session_id = students.session_id'],
            ],
            $where,
            [
                'users.*',
                'students.id as student_id',
                'students.address',
                'students.consultant_id',
                'students.source',
                'students.admission_status',
                'university.title as university_name',
                'students.course_id',
                'course.title as course_name',
                'consultants.name as consultant_name',
                'sessions.session_title as session',
                'IF(students.referred_by = 0 OR clients.id IS NULL, "Not Referred", clients.name) as referred_by_client'
            ]
        )->getResultArray();

        $added_count = 0;
        $partial_count = 0;
        $not_added_count = 0;
        foreach ($this->data['students'] as &$student) {

            $student['total_course_amount'] = array_sum(array_column(
                $this->data['specialisations'] = $this->course_model->get_join(
                    [['specialisations', 'specialisations.course_id = course.id']],
                    ['course.id' => $student['course_id']],
                    ['specialisations.fee_structure', 'specialisations.total_amount']
                )->getResultArray(),
                'total_amount'
            ));

            $installments = $this->installment_model->get(['student_id' => $student['id']])->getResultArray();

            $total_course_amount = $student['total_course_amount'];
            $added_amount = array_sum(array_column($installments, 'installment_amount'));
            $tnot_added_amount = $total_course_amount - $added_amount;

            if ($added_amount == 0) {
                $student['installment_status'] = 'not_added';
                $not_added_count++;
            } else if ($added_amount == $total_course_amount) {
                $added_count++;
                $student['installment_status'] = 'added';
            } else {
                $partial_count++;
                $student['installment_status'] = 'partially_added';
            }

        }

        if ($status = $this->request->getGet('list_by')) {
            $validStatuses = ['added', 'partially_added', 'not_added'];

            if (in_array($status, $validStatuses)) {
                $this->data['students'] = array_filter($this->data['students'], fn($stud) => $stud['installment_status'] === $status);
            }
        }



        // echo "<pre>"; print_r($this->data['students']); exit;
        $this->data['added_count'] = $added_count;
        $this->data['not_added_count'] = $not_added_count;
        $this->data['partial_count'] = $partial_count;

        $this->data['courses'] = $this->course_model->get()->getResultArray();
        $this->data['universities'] = $this->university_model->get()->getResultArray();
        $this->data['consultants'] = $this->users_model->get(['role_id' => 6], ['id', 'name'])->getResultArray();

        $this->data['page_title'] = 'Fee Installmets';
        $this->data['page_name'] = 'Fee_managment/course_fee';

        return view('App/index', $this->data);
    }

    public function payment_status()
    {
        $from_date = '';
        $to_date = '';
        $university_id = '';
        $course_id = '';

        $where = [];
        $where = ['users.role_id' => 2];

        if (!empty($this->request->getGet('name'))) {
            $where += [
                'users.name LIKE' => '%' . $this->request->getGet('name') . '%'
            ];
        }


        if (!empty($this->request->getGet('from_date'))) {
            $where += [
                'student_payments.due_date >=' => $this->request->getGet('from_date'),
            ];
            $from_date = $this->request->getGet('from_date');
        }

        if (!empty($this->request->getGet('to_date'))) {
            $where += [
                'student_payments.due_date <=' => $this->request->getGet('to_date')
            ];
            $to_date = $this->request->getGet('to_date');
        }


        if ($this->request->getGet('course_id') != null) {
            $where += [
                'student_payments.course_id' => $this->request->getGet('course_id')
            ];
            $course_id = $this->request->getGet('course_id');
        }


        $this->data['payments'] = $this->student_fee_model->get_join(
            [
                ['users', 'users.id = student_payments.user_id'],
                ['course', 'course.id = student_payments.course_id'],
            ],
            $where,
            ['student_payments.*', 'users.name as student_name',  'course.title as course_title', 'users.student_id'],['student_payments.created_at' => 'desc']
        )->getResultArray();

        // Initialize totals: amount and count for each status
        $totals = [
            1 => ['amount' => 0, 'count' => 0], // OVERDUE
            2 => ['amount' => 0, 'count' => 0], // DUE
            3 => ['amount' => 0, 'count' => 0], // UPCOMING
            4 => ['amount' => 0, 'count' => 0], // PAID
        ];

        $today = new DateTime();

        // foreach ($this->data['payments'] as &$payment) {
        //     $status = strtolower($payment['status']);
        //     $dueDate = new DateTime($payment['due_date']);
        //     $amount = (float)$payment['amount'];

        //     if ($status === 'paid') {
        //         $payment['payment_status'] = 4;
        //     } else {
        //         $dueMonth = (int)$dueDate->format('m');
        //         $dueYear = (int)$dueDate->format('Y');
        //         $currentMonth = (int)$today->format('m');
        //         $currentYear = (int)$today->format('Y');

        //         if ($dueYear === $currentYear && $dueMonth === $currentMonth) {
        //             $payment['payment_status'] = 2; // DUE
        //         } elseif (
        //             ($dueYear === $currentYear && $dueMonth === $currentMonth + 1) ||
        //             ($dueYear === $currentYear + 1 && $currentMonth === 12 && $dueMonth === 1)
        //         ) {
        //             $payment['payment_status'] = 3; // UPCOMING
        //         } elseif ($dueDate < $today) {
        //             $payment['payment_status'] = 1; // OVERDUE
        //         } else {
        //             $payment['payment_status'] = 2; // fallback as DUE
        //         }
        //     }

        //     // Add to totals
        //     $key = $payment['payment_status'];
        //     $totals[$key]['amount'] += $amount;
        //     $totals[$key]['count']++;
        // }

        foreach ($this->data['payments'] as &$payment) {
            $status = strtolower($payment['status']);
            $dueDate = new DateTime($payment['due_date']);
            $amount = (float) $payment['amount'];

            if ($status === 'paid') {
                $payment['payment_status'] = 4; // PAID
            } else {
                $dueMonth = (int) $dueDate->format('m');
                $dueYear = (int) $dueDate->format('Y');
                $currentMonth = (int) $today->format('m');
                $currentYear = (int) $today->format('Y');

                // Compare year-month combinations
                if ($dueYear < $currentYear || ($dueYear === $currentYear && $dueMonth < $currentMonth)) {
                    $payment['payment_status'] = 1; // OVERDUE (previous month/year)
                } elseif ($dueYear === $currentYear && $dueMonth === $currentMonth) {
                    $payment['payment_status'] = 2; // DUE (current month)
                } else {
                    $payment['payment_status'] = 3; // UPCOMING (future month/year)
                }
            }

            // Add to totals
            $key = $payment['payment_status'];
            $totals[$key]['amount'] += $amount;
            $totals[$key]['count']++;
        }

        // Add status labels (same as before)
        $this->data['statusLabels'] = [
            1 => ['label' => 'OVERDUE', 'class' => 'danger'],
            2 => ['label' => 'DUE', 'class' => 'warning'],
            3 => ['label' => 'UPCOMING', 'class' => 'info'],
            4 => ['label' => 'PAID', 'class' => 'success'],
        ];

        // Set totals data to pass to view
        $this->data['totals'] = $totals;

        $this->data['count_overdue'] = $totals[1]['count']; // OVERDUE
        $this->data['count_due'] = $totals[2]['count']; // DUE
        $this->data['count_upcoming'] = $totals[3]['count']; // UPCOMING
        $this->data['count_paid'] = $totals[4]['count']; // PAID
        $this->data['count_all'] = array_sum(array_column($totals, 'count'));

        $listBy = $this->request->getGet('list_by');

        if ($listBy && in_array($listBy, [1, 2, 3, 4])) {
            $filteredPayments = array_filter($this->data['payments'], function ($payment) use ($listBy) {
                return $payment['payment_status'] == $listBy;
            });

            $this->data['payments'] = $filteredPayments;
        }

        // echo "<pre>"; print_r($this->data['payments']); exit;

        $this->data['from_date'] = $from_date;
        $this->data['to_date'] = $to_date;
        $this->data['course_id'] = $course_id;
        $this->data['courses'] = $this->course_model->get()->getResultArray();
        $this->data['page_title'] = 'Payment Status';
        $this->data['page_name'] = 'Fee_management/payment_status';

        return view('Admin/index', $this->data);
    }


    public function get_user_course_amount($course_id, $student_id)
    {
        $course = $this->course_model->get(['id' => $course_id])->getRowArray();
        $enrol  = $this->enrol_model->get(['user_id' => $student_id, 'course_id' => $course_id])->getRowArray();
        $total_course_amount = $course['total_amount'] ?? 0;

        $discount_percent = $enrol['discount_perc'] ?? 0;

        $list_items = $this->student_fee_model->get([
            'user_id'   => $student_id,
            'course_id' => $course_id
        ])->getResultArray();

        $added_amount = array_sum(array_column($list_items, 'amount'));

        // Calculate the discount amount (how much is being discounted)
        $discount_amount = ($total_course_amount * $discount_percent) / 100;

        // Calculate the final discounted price (what student needs to pay)
        $discounted_price = $total_course_amount - $discount_amount;

        //log_message('error', 'Discounted Price: ' . $discounted_price);

        // Calculate how much is still remaining to be paid
        $not_added_amount = $discounted_price - $added_amount;

        return $this->response->setJSON([
            'total_course_amount' => $total_course_amount,
            'discounted_price'    => $discounted_price,  // Added this for clarity
            'added_amount'        => $added_amount,
            'not_added_amount'    => $not_added_amount
        ]);
    }

}
