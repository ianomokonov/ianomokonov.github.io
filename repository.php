<?php

if(isset($_GET['key'])){
    switch ($_GET['key']) {
        case 'set-password':
            genPassword();
            return;
        case 'hash-password':
            hashPassword();
            return;
        case 'sign-in':
            $data = json_decode(file_get_contents("php://input"));
            echo json_encode(signIn($data));
            return;
        case 'data-save':
            $data = json_decode(file_get_contents("php://input"));
            echo json_encode(dataSave($data));
            return;
        default:
            return array("message" => "Ключ запроса не найден");
    }
}

function genPassword(){
    $chars="qazxswedcvfrtgbnhyujmkiolp1234567890QAZXSWEDCVFRTGBNHYUJMKIOLP";
    $max=10;
    $size=StrLen($chars)-1;
    $password=null;
    while($max--) $password.=$chars[rand(0,$size)];
    file_put_contents('./admin-data.php', $password, FILE_APPEND);
}

function hashPassword(){
    $user = file('./admin-data.php');
    $password = trim($user[2]);
    $hasPassword = password_hash($password, PASSWORD_BCRYPT);
    file_put_contents('./admin-data.php', $hasPassword, FILE_APPEND);
}

function signIn($user){
    if (!$user->login) {
        return array("message" => "Введите логин", "method" => "signIn");
    }
    $data = file('./admin-data.php');
    $login = trim($data[1]);
    $password = trim($data[3]);
    if($user->login == $login){
        if(!password_verify($user->password, $password)){
            return array("message" => "Неверный пароль", "method" => "signIn");
        }
        return true;
    }
    return array("message" => "Неверный логин", "method" => "signIn");
}

function dataSave($data){
    if ($data) {
        file_put_contents('./data.json', json_encode($data));
        return array("message" => "Данные обновлены", "method" => "dataSave");
    }
    else {
        return array("message" => "Ошибка загрузки данных", "method" => "dataSave", "requestData" => $data);
    }
}

?>