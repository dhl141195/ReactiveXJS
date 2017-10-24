# Nội dung

- [Reactive programming là gì](#reactive-programming-la-gi)
- [Tại sao nên áp dụng React Programming](#tai-sao-nen-ap-dung-react-programming)
- [Thinking in RP](#thinking-in-rp)
    - [Xây dựng "Account suggestion box" sử dụng RxJS](#xay-dung-account-suggestion-box-su-dung-rxjs)
        - [Load & render 3 account khi vừa vào trang](#load-render-3-account-khi-vua-vao-trang)
        - [Load & render 3 account khi click "Refresh"](#load-render-3-account-khi-click-refresh)

# Reactive programming là gì

> Reactive Programming (RP) is programming with **asynchronous data streams**.

Trong RP, mọi thứ đều có thể tạo thành 1 data stream, ví dụ như: variable, user input, data structures... Ta sẽ lắng nghe stream đó và react mỗi khi stream phát sự kiện.

Khi đã có 1 data stream, ta có thể gắn thêm vô số chức năng cho stream. Ví dụ như filter một stream để chỉ bắt các sự kiện mà mình muốn, hoặc map data value từ 1 stream sang stream khác, hoặc merge 2 stream thành 1 stream...

Stream là một chuỗi các sự kiện theo thời gian. Nó có thể emit value, error hoặc "completed" signal. Ta có thể khai báo 3 function để nhận 3 loại data này.

Function ta khai báo để nhận data được gọi là **observer**. Quá trình lắng nghe gọi là **subscription**. Còn stream được gọi là **observable** (hoặc **subject** trong một số trường hợp)

# Tại sao nên áp dụng React Programming

Sự phát triển của ứng dụng đòi hỏi các ứng dụng ngày nay phải đáp ứng được nhu cầu tương tác real-time, liên tục của người dùng. Vì vậy cần phải có phải có giải pháp phù hợp để làm việc với real-time event một cách hiệu quả, Reactive Programming chính là câu trả lời.

RP abstract code, giúp code chainable theo dạng ống khói. Nhờ vậy ta chỉ cần tập trung xem các event sẽ phụ thuộc vào nhau như thế nào thay vì nghĩ các implement, handle error...

# Thinking in RP

## Xây dựng "Account suggestion box" sử dụng RxJS

![Demo Image](http://i.imgur.com/eAlNb0j.png)

Chức năng chính:

_ Load data từ API, hiển thị 3 account
_ Khi click "Refresh", load 3 account khác

### Load & render 3 account khi vừa vào trang

Đầu tiên, cần nhớ Rx mantra: **Everything can be a stream**

Vì vậy ta coi request như 1 stream, nó sẽ emit request URL với mỗi request

```
--a------|->

a là string request URL 'https://api.github.com/users'
```

Tạo stream single value với Rx:

```js
var requestStream = Rx.Observable.just('https://api.github.com/users');
```

Ta sẽ **subscribe** requestStream, khi requestStream emit value ta sẽ fetch data từ URL mà nó emit.

```js
requestStream.subscribe(function(requestUrl) {
  // execute the request
  jQuery.getJSON(requestUrl, function(responseData) {
    // ...
  });
}
```

Ở trên ta sử dụng jQuery Ajax callback, giờ sẽ chuyển sang dùng Rx để tạo stream từ response và subscribe stream đó để nhận data fetch từ API.

```js
requestStream.subscribe(function(requestUrl) {
  // execute the request
  var responseStream = Rx.Observable.create(function (observer) {
    jQuery.getJSON(requestUrl)
    .done(function(response) { observer.onNext(response); })
    .fail(function(jqXHR, status, error) { observer.onError(error); })
    .always(function() { observer.onCompleted(); });
  });

  responseStream.subscribe(function(response) {
    // do something with the response
  });
}
```

Ta vừa mới wrap jQuery Ajax Promise thành 1 Observable. Thực tế trong Rx có thể chuyển Promise thành 1 Observable vô cùng đơn giản ```var stream = Rx.Observable.fromPromise(promise)```.

>Một Promise chỉ có thể emit 1 value. Trong khi đó, một Rx stream có thể emit nhiều value. <br/>
Nghĩa là **Observable >= Promise**

Quay lại ví dụ thì hiện tại ta đang lồng 2 **subsribe()**, giống như callback hell. Và vì việc tạo responseStream phụ thuộc vào requestStream nên ta sẽ dùng operator ```map(f)``` để transform requestStream thành response stream.

```js
var responseMetastream = requestStream
  .map(function(requestUrl) {
    return Rx.Observable.fromPromise(jQuery.getJSON(requestUrl));
  });
```

Ở đây ta map mỗi 1 requestUrl mà requestStream emit thành 1 response stream. Kết quả trả về của hàm map trong trường hợp này là 1 **metastream**. Metastream là 1 stream emit value là 1 stream khác.

![Metastream](http://i.imgur.com/HHnmlac.png)

Nếu muốn nhận được data, ta phải subscribe metastream. Khi nó emit 1 stream, ta phải tiếp tục subsribe stream đó để nhận data -> NOOOOOO

Ta chỉ muốn 1 stream đơn giản emit response data từ API. Giải pháp là ```flatMap(f)```, một phiên bản khác của map, nó sẽ *flatten metastream*. Stream trả về từ ```flatMap(f)``` sẽ subscribe stream mà metastream emit và emit value ta cần

![](http://i.imgur.com/Hi3zNzJ.png)

Tổng hợp lại ta có code cho chức năng đầu tiên:

```js
var requestStream = Rx.Observable.just('https://api.github.com/users');

var responseStream = requestStream
  .flatMap(function(requestUrl) {
    return Rx.Observable.fromPromise(jQuery.getJSON(requestUrl));
  });

responseStream.subscribe(function(response) {
  // render `response` to the DOM however you wish
});
```

### Load & render 3 account khi click "Refresh"

Ta tạo 1 stream emit các click event khi click "Refresh".

```js
var refreshButton = document.querySelector('.refresh');
var refreshClickStream = Rx.Observable.fromEvent(refreshButton, 'click');
```

requestStream bây giờ sẽ phục thuộc vào refreshClickStream. Mỗi khi refreshClickStream emit, requestStream phải emit 1 string URL mới. Vì vậy ta dùng ```map(f)```:

```js
var requestStream = refreshClickStream
  .map(function() {
    var randomOffset = Math.floor(Math.random()*500);
    return 'https://api.github.com/users?since=' + randomOffset;
  });
```

Nhưng như vậy khi load trang, requestStream sẽ không emit để load 3 account đầu tiên nữa. Ta có thể tách riêng thành 2 stream:

```js
var requestOnRefreshStream = refreshClickStream
  .map(function() {
    var randomOffset = Math.floor(Math.random()*500);
    return 'https://api.github.com/users?since=' + randomOffset;
  });

var startupRequestStream = Rx.Observable.just('https://api.github.com/users');
```

Sau đó ta có thể merge 2 stream này thành 1 sử dụng hàm ```merge()```:

```
stream A: ---a--------e-----o----->
stream B: -----B---C-----D-------->
          vvvvvvvvv merge vvvvvvvvv
          ---a-B---C--e--D--o----->
```

Như vậy ta có:

```js
var requestOnRefreshStream = refreshClickStream
  .map(function() {
    var randomOffset = Math.floor(Math.random()*500);
    return 'https://api.github.com/users?since=' + randomOffset;
  });

var startupRequestStream = Rx.Observable.just('https://api.github.com/users');

var requestStream = Rx.Observable.merge(
  requestOnRefreshStream, startupRequestStream
);
```

Viết ngắn gọn hơn, loại bỏ các temp stream:

```js
var requestStream = refreshClickStream
  .map(function() {
    var randomOffset = Math.floor(Math.random()*500);
    return 'https://api.github.com/users?since=' + randomOffset;
  })
  .merge(Rx.Observable.just('https://api.github.com/users'));
```

Ngắn hơn nữa:

```js
var requestStream = refreshClickStream
  .map(function() {
    var randomOffset = Math.floor(Math.random()*500);
    return 'https://api.github.com/users?since=' + randomOffset;
  })
  .startWith('https://api.github.com/users');
```

Function ```startWith(x)``` sẽ trả về 1 stream emit value x đầu tiên, sau đó sẽ emit bình thường như input stream. Vì vậy ta có thể fake sự kiện click "Refresh" khi trang vừa load xong để không phải lặp lại URL 2 lần:

```js
var requestStream = refreshClickStream.startWith('startup click')
  .map(function() {
    var randomOffset = Math.floor(Math.random()*500);
    return 'https://api.github.com/users?since=' + randomOffset;
  });
```

Tiếp theo ta cần xoá các account hiện tại mỗi khi click "Refresh"

```js
refreshClickStream.subscribe(function() {
  // clear the 3 suggestion DOM elements
});
```

Nghĩ đơn giản thì có thể làm như trên, nhưng làm như vậy là **BAD PRACTICE** vì sẽ có **hai** observer cùng tác động đến suggestion box DOM (vi phạm *single source of truth*)

Thay vào đó, ta sẽ tách riêng 3 suggestion và coi mỗi 1 suggestion là 1 stream, stream này sẽ emit value là JSON object chứa thông tin của suggestion account đó. Stream cho suggestion#1 sẽ như sau:

```js
var suggestion1Stream = responseStream
  .map(function(listUsers) {
    // get one random user from the list
    return listUsers[Math.floor(Math.random()*listUsers.length)];
  });
```

Tương tự với suggestion#2 và suggestion#3. Khi đó việc render sẽ được thực hiện trong ```subscribe()``` của các suggestion stream:

```js
suggestion1Stream.subscribe(function(suggestion) {
  // render the 1st suggestion to the DOM
});
```

Để xoá các account hiện tại, ta chỉ cần map refreshClickStream thành null suggestion data:

```js
var suggestion1Stream = responseStream
  .map(function(listUsers) {
    // get one random user from the list
    return listUsers[Math.floor(Math.random()*listUsers.length)];
  })
  .merge(
    refreshClickStream.map(function(){ return null; })
  );
```

Và khi render, ta check nếu suggestion data null thì xoá account:

```js
suggestion1Stream.subscribe(function(suggestion) {
  if (suggestion === null) {
    // hide the first suggestion DOM element
  }
  else {
    // show the first suggestion DOM element
    // and render the data
  }
});
```

Bonus (render empty khi mới load trang):

```js
var suggestion1Stream = responseStream
  .map(function(listUsers) {
    // get one random user from the list
    return listUsers[Math.floor(Math.random()*listUsers.length)];
  })
  .merge(
    refreshClickStream.map(function(){ return null; })
  )
  .startWith(null);
```

Ta được diagram tổng quát như sau:

```
refreshClickStream: ----------o---------o---->
     requestStream: -r--------r---------r---->
    responseStream: ----R----------R------R-->
 suggestion1Stream: -N--s-----N----s----N-s-->
 suggestion2Stream: -N--q-----N----q----N-q-->
 suggestion3Stream: -N--t-----N----t----N-t-->
 ```

