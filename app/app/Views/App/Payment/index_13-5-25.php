 <style>
        .custom-card {
            border-radius: 12px;
            padding: 20px;
            background: #fff;
        }
        .icon-text {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #6c757d;
            justify-content: between;
        }
        .divider {
            width: 100%;
            height: 1px;
            background: #ddd;
            margin: 10px 0;
        }
        .amount {
            font-size: 24px;
            font-weight: bold;
            color: #000;
        }
        
        .chart-container {
            /*width: 80%;*/
            /*max-width: 700px;*/
            height: 400px; /* Add a fixed height */
            padding: 20px;
            border-radius: 12px;
            position: relative; /* Ensure it doesn't expand */
        }
        
        .table-container {
            background: #fff;
            padding: 20px;
            border-radius: 12px;
        }
        .status-success {
            background-color: #198754;
            color: #fff;
            border-radius: 15px;
            padding: 5px 15px;
            font-weight: bold;
        }
        .status-pending {
            background-color: #f8d7da;
            color: #dc3545;
            border-radius: 15px;
            padding: 5px 15px;
            font-weight: bold;
        }
        .progress-card {
            width: 300px;
            background: #fff;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
        }

        .semi-circle {
            transform: rotate(180deg);
        }

        .progress-text {
            font-size: 24px;
            font-weight: bold;
            margin-top: -40px;
            position: relative;
            z-index: 1;
        }

        .progress-info {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }

        .well-done {
            margin-top: 10px;
            font-weight: bold;
            color: #ff7f2a;
        }
    </style>
    
    <div class="container-fluid">
        <h3 class="mb-3">Payments</h3>
        <div class="row">
            <div class="col-12">
                <div class="row">
                    <div class="col-12 col-sm-6 col-md-4 d-none">
                         <div class="custom-card">
                            <div class="icon-text">
                                <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiitotalamount.png" style="width: 40px; height: 40px;">
                                <span>Total Amount</span>
                            </div>
                            <div class="divider"></div>
                            <div class="amount">₹ 25000</div>
                        </div>
                    </div>
                    <div class="col-12 col-sm-6 col-md-4 d-none">
                         <div class="custom-card">
                            <div class="icon-text">
                                <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiibalanceamount.png" style="width: 40px; height: 40px;">
                                <span>Balance Amount</span>
                            </div>
                            <div class="divider"></div>
                            <div class="amount">₹ 25000</div>
                        </div>
                    </div>
                    <div class="col-12 col-sm-6 col-md-4">
                         <div class="custom-card">
                            <div class="icon-text">
                                <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiinextpaymentdate.png" style="width: 40px; height: 40px;">
                                <span>Next Payment Date</span>
                            </div>
                            <div class="divider"></div>
                            <div class="amount"><?= $next_payment_date ?? '' ?></div>
                        </div>
                    </div>
                </div>
                <div class="card rounded-4 mt-4 d-none">
                    <div class="card-body pb-5">
                        <div class="chart-container">
                            <h3>Monthly Transaction Overview</h3>
                            <canvas id="transactionChart"></canvas>
                        </div>
                        
                        <script>
                            document.addEventListener("DOMContentLoaded", function () {
                                const ctx = document.getElementById("transactionChart").getContext("2d");
                        
                                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                                gradient.addColorStop(0, "rgba(255, 140, 0, 0.5)"); // Light Orange
                                gradient.addColorStop(1, "rgba(255, 140, 0, 0)");   // Transparent
                        
                                const data = {
                                    labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL"],
                                    datasets: [{
                                        label: "Transactions",
                                        data: [5000, 12000, 8000, 25000, 856, 14000, 11000],
                                        borderColor: "#ff8c00",
                                        borderWidth: 3,
                                        backgroundColor: gradient,
                                        fill: true,
                                        pointRadius: 5,
                                        pointBackgroundColor: "#ff8c00",
                                        pointBorderColor: "#fff",
                                        pointHoverRadius: 7,
                                        tension: 0.4 // Smooth curve
                                    }]
                                };
                        
                                const options = {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        tooltip: {
                                            backgroundColor: "#000",
                                            titleFont: { weight: "bold" },
                                            bodyFont: { size: 14 },
                                            padding: 10,
                                            displayColors: false,
                                            callbacks: {
                                                label: function (tooltipItem) {
                                                    return ` ₹ ${tooltipItem.raw.toLocaleString()}`;
                                                }
                                            }
                                        },
                                        legend: { display: false }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: function (value) {
                                                    return `₹ ${value / 1000}k`;
                                                }
                                            },
                                            grid: { color: "#eee", drawBorder: false }
                                        },
                                        x: {
                                            grid: { display: false },
                                            ticks: { font: { weight: "bold" } }
                                        }
                                    }
                                };
                        
                                new Chart(ctx, {
                                    type: "line",
                                    data: data,
                                    options: options
                                });
                            });
                        </script>
                    </div>
                </div>
                <div>
                    <div class="table-container mt-4">
                        <h4 class="fw-bold">Transaction History</h4>
                        <table class="table align-middle">
                            <thead>
                                <tr class="text-muted">
                                    <th>SNO.</th>
                                    <th>Course Name</th>
                                    <th>Installment Details</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Payment Method</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (!empty($list_items)) { ?>
                                    <?php foreach ($list_items as $key => $list_item) { ?>
                                        <tr class="border rounded-3">
                                            <td><?= ++$key ?></td>
                                            <td>
                                                <?php
                                                // Check if the course_id exists in the courses array
                                                if (array_key_exists($list_item['course_id'], $courses)) {
                                                    echo $courses[$list_item['course_id']];
                                                } else {
                                                    echo 'N/A'; // Display 'N/A' if the course_id does not exist
                                                }
                                                ?>
                                            </td>
                                            <td><?= $list_item['installment_details'] ?></td>
                                            <td><?= $list_item['amount'] ?></td>
                                            <td><?= $list_item['due_date'] ?></td>
                                            <td><?= $list_item['payment_mode'] ?></td>
                                            <td>
                                                <?php
                                                // Add a class based on the status for styling
                                                $statusClass = strtolower($list_item['status']) === 'paid' ? 'status-success' : 'status-pending';
                                                ?>
                                                <span class="<?= $statusClass ?>"><?= $list_item['status'] ?></span>
                                            </td>
                                        </tr>
                                    <?php } ?>
                                <?php } ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="col-12 col-lg-3 d-none">
                <div class="progress-card">
        <h5 class="fw-bold">Primary Teacher</h5>
        
        <!-- Semi-Circle Progress -->
        <svg width="150" height="80" viewBox="0 0 100 50">
            <!-- Background Arc -->
            <path d="M 10 50 A 40 40 0 1 1 90 50" fill="none" stroke="#f8c6a0" stroke-width="8"/>
            
            <!-- Progress Arc (Dynamic based on percentage) -->
            <path d="M 10 50 A 40 40 0 1 1 90 50" fill="none" stroke="#6a93c8" stroke-width="8" stroke-dasharray="92,100"/>
            
            <!-- Circle at the end -->
            <circle cx="82" cy="22" r="4" fill="#ff6833"/>
        </svg>

        <div class="progress-text">92%</div>
        <div class="progress-info">You Completed 92%<br>Payment</div>
        <div class="well-done">Well Done!</div>
    </div>
            </div>
        </div>
    </div>